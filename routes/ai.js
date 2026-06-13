const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { authMiddleware } = require('../middleware/auth');

router.get('/analyze/:venueId', authMiddleware, async (req, res) => {
  const venueResult = await pool.query('SELECT * FROM venues WHERE id = $1', [req.params.venueId]);
  const venue = venueResult.rows[0];
  if (!venue) return res.status(404).json({ error: 'Mekan bulunamadı' });

  const reviewsResult = await pool.query('SELECT * FROM reviews WHERE venue_id = $1', [req.params.venueId]);
  const reviews = reviewsResult.rows;

  let prompt = '';

  if (reviews.length === 0) {
    // Yorum yok, web search ile analiz yap
    prompt = `"${venue.name}" adlı mekan hakkında internette arama yap ve bulduğun maksimum 10 yorumu değerlendir. 
Fiyat, Lokasyon ve Hizmet açısından 10 üzerinden birer puan ver ve 3-5 cümlelik kısa Türkçe bir genel analiz yaz. 
Samimi ve anlaşılır bir dil kullan. Eğer bu mekan hakkında yeterli bilgi bulamazsan bunu belirt.
Yanıtını şu formatta ver:
ANALİZ: [analiz metni]
FİYAT: [puan]/10
LOKASYON: [puan]/10
HİZMET: [puan]/10`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();
      const textBlock = data.content.find(b => b.type === 'text');
      const fullText = textBlock ? textBlock.text : '';

      const analizMatch = fullText.match(/ANALİZ:\s*(.+?)(?=FİYAT:|$)/s);
      const fiyatMatch = fullText.match(/FİYAT:\s*(\d+(?:\.\d+)?)\/10/);
      const lokasyonMatch = fullText.match(/LOKASYON:\s*(\d+(?:\.\d+)?)\/10/);
      const hizmetMatch = fullText.match(/HİZMET:\s*(\d+(?:\.\d+)?)\/10/);

      return res.json({
        venue: venue.name,
        avgPrice: fiyatMatch ? fiyatMatch[1] : '?',
        avgLocation: lokasyonMatch ? lokasyonMatch[1] : '?',
        avgService: hizmetMatch ? hizmetMatch[1] : '?',
        analysis: analizMatch ? analizMatch[1].trim() : fullText,
        source: 'web'
      });
    } catch (err) {
      return res.status(500).json({ error: 'AI analizi başarısız', detail: err.message });
    }
  }

  // Yorum var, normal analiz
  const decoded = reviews.map(r => ({
    ...r,
    comment: Buffer.from(r.comment, 'base64').toString('utf-8')
  }));

  const avgPrice = (decoded.reduce((s, r) => s + r.price_score, 0) / decoded.length).toFixed(1);
  const avgLocation = (decoded.reduce((s, r) => s + r.location_score, 0) / decoded.length).toFixed(1);
  const avgService = (decoded.reduce((s, r) => s + r.service_score, 0) / decoded.length).toFixed(1);

  const reviewText = decoded.map((r, i) =>
    'Yorum ' + (i+1) + ': "' + r.comment + '" | Fiyat: ' + r.price_score + '/10, Lokasyon: ' + r.location_score + '/10, Hizmet: ' + r.service_score + '/10'
  ).join('\n');

  prompt = 'Sen bir mekan değerlendirme asistanısın. Aşağıda "' + venue.name + '" adlı mekana yapılmış yorumlar ve puanlar var.\nOrtalama puanlar: Fiyat ' + avgPrice + '/10, Lokasyon ' + avgLocation + '/10, Hizmet ' + avgService + '/10.\n\nYorumlar:\n' + reviewText + '\n\nLütfen bu mekana dair 3-5 cümlelik kısa, sade Türkçe bir genel analiz yaz. Ardından Fiyat, Lokasyon ve Hizmet için birer genel değerlendirme cümlesi söyle. Çok resmi olma, samimi ve anlaşılır bir dil kullan.';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const analysis = data.content[0].text || 'Analiz alınamadı.';
    res.json({ venue: venue.name, avgPrice, avgLocation, avgService, analysis, source: 'local' });
  } catch (err) {
    res.status(500).json({ error: 'AI analizi başarısız', detail: err.message });
  }
});

module.exports = router;