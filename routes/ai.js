const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authMiddleware } = require('../middleware/auth');

router.get('/analyze/:venueId', authMiddleware, async (req, res) => {
  const venue = db.prepare('SELECT * FROM venues WHERE id = ?').get(req.params.venueId);
  if (!venue) return res.status(404).json({ error: 'Mekan bulunamadı' });

  const reviews = db.prepare('SELECT * FROM reviews WHERE venue_id = ?').all(req.params.venueId);
  if (reviews.length === 0)
    return res.status(400).json({ error: 'Henüz yorum yok, analiz yapılamaz' });

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

  const prompt = 'Sen bir mekan değerlendirme asistanısın. Aşağıda "' + venue.name + '" adlı mekana yapılmış yorumlar ve puanlar var.\nOrtalama puanlar: Fiyat ' + avgPrice + '/10, Lokasyon ' + avgLocation + '/10, Hizmet ' + avgService + '/10.\n\nYorumlar:\n' + reviewText + '\n\nLütfen bu mekana dair 3-5 cümlelik kısa, sade Türkçe bir genel analiz yaz. Ardından Fiyat, Lokasyon ve Hizmet için birer genel değerlendirme cümlesi söyle. Çok resmi olma, samimi ve anlaşılır bir dil kullan.';

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
    res.json({ venue: venue.name, avgPrice, avgLocation, avgService, analysis });
  } catch (err) {
    res.status(500).json({ error: 'AI analizi başarısız', detail: err.message });
  }
});

module.exports = router;