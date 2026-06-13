const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../database');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
  const result = await pool.query('SELECT * FROM venues ORDER BY created_at DESC');
  res.json(result.rows);
});

router.post('/', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Mekan adı gerekli' });

  const exists = await pool.query('SELECT id FROM venues WHERE name = $1', [name]);
  if (exists.rows.length > 0) return res.status(409).json({ error: 'Bu mekan zaten kayıtlı' });

  const id = uuidv4();
  await pool.query('INSERT INTO venues (id, name, created_by) VALUES ($1, $2, $3)', [id, name, req.user.id]);

  res.json({ message: 'Mekan eklendi', id });
});

module.exports = router;