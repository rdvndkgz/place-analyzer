const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/:venueId', authMiddleware, async (req, res) => {
  const result = await pool.query(
    'SELECT r.*, u.full_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.venue_id = $1 ORDER BY r.created_at DESC',
    [req.params.venueId]
  );
  const decoded = result.rows.map(r => ({
    ...r,
    comment: Buffer.from(r.comment, 'base64').toString('utf-8')
  }));
  res.json(decoded);
});

router.post('/', authMiddleware, async (req, res) => {
  const { venue_id, price_score, location_score, service_score, comment } = req.body;
  if (!venue_id || !comment || price_score == null || location_score == null || service_score == null)
    return res.status(400).json({ error: 'Tüm alanlar zorunlu' });

  const scores = [price_score, location_score, service_score];
  if (scores.some(s => s < 1 || s > 10))
    return res.status(400).json({ error: 'Puanlar 1-10 arasında olmalı' });

  const b64Comment = Buffer.from(comment).toString('base64');
  const id = uuidv4();
  await pool.query(
    'INSERT INTO reviews (id, venue_id, user_id, price_score, location_score, service_score, comment) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id, venue_id, req.user.id, price_score, location_score, service_score, b64Comment]
  );
  res.json({ message: 'Yorum eklendi' });
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const result = await pool.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Yorum bulunamadı' });
  res.json({ message: 'Yorum silindi' });
});

module.exports = router;