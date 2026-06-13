const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authMiddleware } = require('../middleware/auth');

// Tüm mekanları listele
router.get('/', authMiddleware, (req, res) => {
  const venues = db.prepare('SELECT * FROM venues ORDER BY created_at DESC').all();
  res.json(venues);
});

// Mekan ekle
router.post('/', authMiddleware, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Mekan adı gerekli' });

  const exists = db.prepare('SELECT id FROM venues WHERE name = ?').get(name);
  if (exists) return res.status(409).json({ error: 'Bu mekan zaten kayıtlı' });

  const id = uuidv4();
  db.prepare('INSERT INTO venues (id, name, created_by) VALUES (?, ?, ?)')
    .run(id, name, req.user.id);

  res.json({ message: 'Mekan eklendi', id });
});

module.exports = router;