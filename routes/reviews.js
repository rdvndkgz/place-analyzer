const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/:venueId', authMiddleware, (req, res) => {
  const reviews = db.prepare(
    'SELECT r.*, u.full_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.venue_id = ? ORDER BY r.created_at DESC'
  ).all(req.params.venueId);
  const decoded = reviews.map(r => ({
    ...r,
    comment: Buffer.from(r.comment, 'base64').toString('utf-8')
  }));
  res.json(decoded);
});

router.post('/', authMiddleware, (req, res) => {
  const { venue_id, price_score, location_score, service_score, comment } = req.body;
  if (!venue_id || !comment || price_score == null || location_score == null || service_score == null)
    return res.status(400).json({ error: 'Tüm alanlar zorunlu' });
  const scores = [price_score, location_score, service_score];
  if (scores.some(s => s < 1 || s > 10))
    return res.status(400).json({ error: 'Puanlar 1-10 arasında olmalı' });
  const b64Comment = Buffer.from(comment).toString('base64');
  const id = uuidv4();
  db.prepare(
    'INSERT INTO reviews (id, venue_id, user_id, price_score, location_score, service_score, comment) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, venue_id, req.user.id, price_score, location_score, service_score, b64Comment);
  res.json({ message: 'Yorum eklendi' });
});

router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Yorum bulunamadı' });
  res.json({ message: 'Yorum silindi' });
});

module.exports = router;