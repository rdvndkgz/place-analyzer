require('dotenv').config();
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const db = new Database(path.join(__dirname, 'mekan.db'));

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS venues (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      price_score INTEGER NOT NULL,
      location_score INTEGER NOT NULL,
      service_score INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (venue_id) REFERENCES venues(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Admin kullanıcıyı oluştur (şifre base64)
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!adminExists) {
    const rawPassword = 'asd!123!dsa';
    const b64Password = Buffer.from(rawPassword).toString('base64');
    db.prepare(`
      INSERT INTO users (id, full_name, email, password, is_admin)
      VALUES (?, ?, ?, ?, 1)
    `).run(uuidv4(), 'Admin', adminEmail, b64Password);
    console.log('Admin kullanıcı oluşturuldu.');
  }
}

module.exports = { db, initDB };