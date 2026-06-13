require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

initDB();

const authRoutes = require('./routes/auth');
const venueRoutes = require('./routes/venues');
const reviewRoutes = require('./routes/reviews');
const aiRoutes = require('./routes/ai');

console.log('auth:', typeof authRoutes);
console.log('venues:', typeof venueRoutes);
console.log('reviews:', typeof reviewRoutes);
console.log('ai:', typeof aiRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/ai', aiRoutes);

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu çalışıyor: http://localhost:${PORT}`));