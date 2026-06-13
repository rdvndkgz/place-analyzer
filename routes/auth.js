const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { db } = require('../database');

// KAYIT
router.post('/signup', (req, res) => {
  const { full_name, email, password } = req.body;
  if (!full_name || !email || !password)
    return res.status(400).json({ error: 'Tüm alanları doldurun' });

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı' });

  const b64Pass = Buffer.from(password).toString('base64');
  const id = uuidv4();
  db.prepare('INSERT INTO users (id, full_name, email, password) VALUES (?, ?, ?, ?)')
    .run(id, full_name, email, b64Pass);

  res.json({ message: 'Kayıt başarılı' });
});

// GİRİŞ
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });

  const b64Pass = Buffer.from(password).toString('base64');
  if (b64Pass !== user.password)
    return res.status(401).json({ error: 'Şifre yanlış' });

  const token = jwt.sign(
    { id: user.id, full_name: user.full_name, email: user.email, is_admin: user.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email, is_admin: user.is_admin } });
});

module.exports = router;