require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS venues (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_by TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      price_score INTEGER NOT NULL,
      location_score INTEGER NOT NULL,
      service_score INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  const adminEmail = process.env.ADMIN_EMAIL || 'rdvndkgz99@gmail.com';
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
  if (existing.rows.length === 0) {
    const b64Password = Buffer.from('asd!123!dsa').toString('base64');
    await pool.query(
      'INSERT INTO users (id, full_name, email, password, is_admin) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), 'Admin', adminEmail, b64Password, 1]
    );
    console.log('Admin kullanıcı oluşturuldu.');
  }
}

module.exports = { pool, initDB };