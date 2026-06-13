const API = '';
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let selectedVenueId = null;

// BAŞLANGIÇ
window.onload = () => {
  if (token && currentUser) showMain();
  else showAuth();
};

// AUTH SEKME
function showTab(tab) {
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('signup-form').style.display = tab === 'signup' ? 'block' : 'none';
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
}

// KAYIT
async function signup() {
  const full_name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const err = document.getElementById('signup-error');

  const res = await fetch(`${API}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name, email, password })
  });
  const data = await res.json();

  if (!res.ok) { err.textContent = data.error; return; }
  err.style.color = '#4caf82';
  err.textContent = 'Kayıt başarılı! Giriş yapabilirsiniz.';
  showTab('login');
}

// GİRİŞ
async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');

  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();

  if (!res.ok) { err.textContent = data.error; return; }

  token = data.token;
  currentUser = data.user;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(currentUser));
  showMain();
}

// ÇIKIŞ
function logout() {
  token = null; currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showAuth();
}

// EKRAN GEÇİŞ
function showAuth() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('main-screen').style.display = 'none';
}

function showMain() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('main-screen').style.display = 'block';
  document.getElementById('user-name').textContent = currentUser.full_name;
  loadVenues();
}

// MEKANLAR
async function loadVenues() {
  const res = await fetch(`${API}/api/venues`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const venues = await res.json();
  const list = document.getElementById('venues-list');

  if (!venues.length) {
    list.innerHTML = '<p class="empty">Henüz mekan eklenmemiş.</p>';
    return;
  }

  list.innerHTML = venues.map(v => `
    <div class="venue-item ${selectedVenueId === v.id ? 'active' : ''}" onclick="selectVenue('${v.id}', '${v.name.replace(/'/g, "\\'")}')">
      <span>📍 ${v.name}</span>
    </div>
  `).join('');
}

async function addVenue() {
  const name = document.getElementById('venue-name-input').value.trim();
  const msg = document.getElementById('venue-msg');
  if (!name) return;

  const res = await fetch(`${API}/api/venues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name })
  });
  const data = await res.json();

  if (!res.ok) { msg.style.color = '#e05b5b'; msg.textContent = data.error; return; }
  msg.style.color = '#4caf82';
  msg.textContent = 'Mekan eklendi!';
  document.getElementById('venue-name-input').value = '';
  loadVenues();
  setTimeout(() => msg.textContent = '', 2000);
}

// MEKAN SEÇ
function selectVenue(id, name) {
  selectedVenueId = id;
  document.getElementById('selected-venue-name').textContent = name;
  document.getElementById('review-section').style.display = 'block';
  switchReviewTab('reviews');
  loadVenues();
  loadReviews();
}

// YORUM SEKMELERİ
function switchReviewTab(tab) {
  document.getElementById('reviews-tab').style.display = tab === 'reviews' ? 'block' : 'none';
  document.getElementById('add-tab').style.display = tab === 'add' ? 'block' : 'none';
  document.getElementById('ai-tab').style.display = tab === 'ai' ? 'block' : 'none';

  document.querySelectorAll('.tabs .tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === ['reviews','add','ai'].indexOf(tab));
  });

  if (tab === 'reviews') loadReviews();
  if (tab === 'ai') document.getElementById('ai-result').innerHTML = '<button onclick="getAIAnalysis()" class="ai-analyze-btn">🤖 Analizi Başlat</button>';
}

// YORUMLARI YÜKlE
async function loadReviews() {
  const res = await fetch(`${API}/api/reviews/${selectedVenueId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const reviews = await res.json();
  const list = document.getElementById('reviews-list');

  if (!reviews.length) {
    list.innerHTML = '<p class="empty">Henüz yorum yapılmamış.</p>';
    return;
  }

  list.innerHTML = reviews.map(r => `
    <div class="review-item">
      <div class="review-header">
        <span class="review-user">${r.full_name}</span>
        <div style="display:flex;gap:8px;align-items:center;">
          <span class="review-date">${r.created_at.split('T')[0]}</span>
          ${currentUser.is_admin ? `<button class="delete-btn" onclick="deleteReview('${r.id}')">Sil</button>` : ''}
        </div>
      </div>
      <div class="review-scores">
        <span class="score-badge price">💰 Fiyat: ${r.price_score}/10</span>
        <span class="score-badge location">📍 Lokasyon: ${r.location_score}/10</span>
        <span class="score-badge service">⭐ Hizmet: ${r.service_score}/10</span>
      </div>
      <p class="review-comment">${r.comment}</p>
    </div>
  `).join('');
}

// YORUM EKLE
async function addReview() {
  const comment = document.getElementById('review-comment').value.trim();
  const price_score = parseInt(document.getElementById('price-score').value);
  const location_score = parseInt(document.getElementById('loc-score').value);
  const service_score = parseInt(document.getElementById('svc-score').value);
  const msg = document.getElementById('review-msg');

  if (!comment) { msg.style.color = '#e05b5b'; msg.textContent = 'Yorum boş olamaz'; return; }

  const res = await fetch(`${API}/api/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ venue_id: selectedVenueId, price_score, location_score, service_score, comment })
  });
  const data = await res.json();

  if (!res.ok) { msg.style.color = '#e05b5b'; msg.textContent = data.error; return; }
  msg.style.color = '#4caf82';
  msg.textContent = 'Yorum eklendi!';
  document.getElementById('review-comment').value = '';
  setTimeout(() => { msg.textContent = ''; switchReviewTab('reviews'); }, 1000);
}

// YORUM SİL (admin)
async function deleteReview(id) {
  if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return;
  const res = await fetch(`${API}/api/reviews/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.ok) loadReviews();
}

// AI ANALİZ
async function getAIAnalysis() {
  const box = document.getElementById('ai-result');
  box.innerHTML = '<p style="color:#c07af0;text-align:center;">🤖 Analiz yapılıyor...</p>';

  const res = await fetch(`${API}/api/ai/analyze/${selectedVenueId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();

  if (!res.ok) {
    box.innerHTML = `<p class="error">${data.error}</p>`;
    return;
  }

  box.innerHTML = `
    <div class="ai-result-box">
      <h3>🤖 AI Analizi — ${data.venue} ${data.source === 'web' ? '<span style="font-size:0.75rem;color:#888;">(web kaynaklı)</span>' : ''}</h3>
      <div class="ai-scores">
        <div class="ai-score-item">
          <div class="label">💰 Fiyat</div>
          <div class="value">${data.avgPrice}/10</div>
        </div>
        <div class="ai-score-item">
          <div class="label">📍 Lokasyon</div>
          <div class="value">${data.avgLocation}/10</div>
        </div>
        <div class="ai-score-item">
          <div class="label">⭐ Hizmet</div>
          <div class="value">${data.avgService}/10</div>
        </div>
      </div>
      <p class="ai-text">${data.analysis}</p>
    </div>
  `;
}

// RANGE GÜNCELLE
function updateVal(id, val) {
  document.getElementById(id).textContent = val;
}