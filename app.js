// ── CONFIG ──────────────────────────────────────────────
const SECTIONS = [
  { id: 'ga',    label: 'Floor GA Pit',    price: 299 },
  { id: 'floor', label: 'Floor Reserved',  price: 249 },
  { id: 'lower', label: 'Lower Bowl',      price: 189 },
  { id: 'mid',   label: 'Mid Level',       price: 129 },
  { id: 'upper', label: 'Upper Deck',      price:  89 },
];

// ── STATE ────────────────────────────────────────────────
let seats = [], cart = [], qty = 2;
let timerVal = 120, timerInterval = null, disappearInterval = null;
let queueInterval = null, queueNum = 847;
let gameOver = false, gameStarted = false, startTime = null;
let selectedFilter = 'all';
let totalReleased = 0;

const canvas  = document.getElementById('venue-canvas');
const ctx     = canvas.getContext('2d');
const mapArea = document.getElementById('map-area');

// ── CANVAS SIZING ────────────────────────────────────────
function sizeCanvas() {
  const r = mapArea.getBoundingClientRect();
  canvas.width  = r.width  || 700;
  canvas.height = r.height || 560;
}

// ── BUILD SEATS ──────────────────────────────────────────
function buildSeats() {
  seats = [];
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H * 0.47;

  // GA Pit (center floor)
  const pitW = 130, pitH = 64;
  const pitX = cx - pitW / 2, pitY = cy - pitH / 2 + 18;
  for (let i = 0; i < 60; i++) {
    const col = i % 13, row = Math.floor(i / 13);
    seats.push({
      id: `ga-${i}`, section: 'ga',
      x: pitX + col * (pitW / 13) + 5,
      y: pitY + row * (pitH / 5) + 5,
      r: 4.5, status: 'available', price: 299, label: 'Floor GA Pit'
    });
  }

  // Floor reserved — in front of pit
  for (let row = 0; row < 5; row++) {
    const count = 13 + row * 2;
    const rowY  = pitY - 26 - row * 14;
    for (let c = 0; c < count; c++) {
      seats.push({
        id: `fl-${row}-${c}`, section: 'floor',
        x: cx - (count / 2 - c) * 13 + 6, y: rowY,
        r: 5, status: 'available', price: 249, label: 'Floor Reserved'
      });
    }
  }
  // Floor reserved — behind pit
  for (let row = 0; row < 4; row++) {
    const count = 13 + row * 2;
    const rowY  = pitY + pitH + 10 + row * 14;
    for (let c = 0; c < count; c++) {
      seats.push({
        id: `flb-${row}-${c}`, section: 'floor',
        x: cx - (count / 2 - c) * 13 + 6, y: rowY,
        r: 5, status: 'available', price: 249, label: 'Floor Reserved'
      });
    }
  }

  // Lower bowl — arc rows
  for (let row = 0; row < 7; row++) {
    const radius = H * 0.3 + row * 19;
    const startA = Math.PI * 0.05, endA = Math.PI * 0.95;
    const steps  = Math.round(17 + row * 3);
    for (let i = 0; i < steps; i++) {
      const a = startA + (endA - startA) * (i / steps);
      seats.push({
        id: `lo-${row}-${i}`, section: 'lower',
        x: cx + Math.cos(Math.PI - a) * radius,
        y: cy - Math.sin(a) * radius * 0.54,
        r: 4.5, status: 'available', price: 189, label: 'Lower Bowl'
      });
    }
  }

  // Mid level
  for (let row = 0; row < 6; row++) {
    const radius = H * 0.44 + row * 18;
    const startA = Math.PI * 0.02, endA = Math.PI * 0.98;
    const steps  = Math.round(23 + row * 3);
    for (let i = 0; i < steps; i++) {
      const a = startA + (endA - startA) * (i / steps);
      seats.push({
        id: `mi-${row}-${i}`, section: 'mid',
        x: cx + Math.cos(Math.PI - a) * radius,
        y: cy - Math.sin(a) * radius * 0.5,
        r: 4, status: 'available', price: 129, label: 'Mid Level'
      });
    }
  }

  // Upper deck
  for (let row = 0; row < 7; row++) {
    const radius = H * 0.57 + row * 16;
    const startA = Math.PI * 0.01, endA = Math.PI * 0.99;
    const steps  = Math.round(27 + row * 4);
    for (let i = 0; i < steps; i++) {
      const a = startA + (endA - startA) * (i / steps);
      seats.push({
        id: `up-${row}-${i}`, section: 'upper',
        x: cx + Math.cos(Math.PI - a) * radius,
        y: cy - Math.sin(a) * radius * 0.46,
        r: 3.5, status: 'available', price: 89, label: 'Upper Deck'
      });
    }
  }

  totalReleased = seats.length;
  updateAvailCount();
}

// ── DRAW ─────────────────────────────────────────────────
function getSeatColor(s) {
  if (s.status === 'taken')    return '#2d3748';
  if (s.status === 'selected') return '#22c55e';
  if (s.status === 'available') {
    return s.section === 'ga' ? '#d97706' : '#3b82f6';
  }
  return '#2d3748';
}

function drawVenue() {
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H * 0.47;
  ctx.clearRect(0, 0, W, H);

  // Field background
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, W * 0.19, H * 0.15, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#0b2210';
  ctx.fill();
  ctx.strokeStyle = '#1a4a1a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Field lines
  ctx.save();
  ctx.strokeStyle = '#1a4a1a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, W * 0.12, H * 0.09, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Stage label
  ctx.save();
  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('◆ STAGE', cx, cy - 8);
  ctx.fillStyle = '#86efac';
  ctx.font = '10px Arial';
  ctx.fillText('← GA PIT →', cx, cy + 8);
  ctx.restore();

  // Level ring guides
  ctx.save();
  [
    { rx: W * 0.32, ry: H * 0.29, color: '#1e3a5f' },
    { rx: W * 0.46, ry: H * 0.42, color: '#1a2744' },
    { rx: W * 0.60, ry: H * 0.53, color: '#162033' },
  ].forEach(({ rx, ry, color }) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, Math.PI * 0.05, Math.PI * 0.95);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  ctx.restore();

  // Section text labels
  const labels = [
    { y: cy - H * 0.3 * 0.56,  text: 'LOWER BOWL' },
    { y: cy - H * 0.44 * 0.52, text: 'MID LEVEL'  },
    { y: cy - H * 0.57 * 0.48, text: 'UPPER DECK' },
  ];
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '9px Arial';
  ctx.fillStyle = '#374151';
  labels.forEach(l => ctx.fillText(l.text, cx, l.y - 10));
  ctx.restore();

  // Seats
  seats.forEach(s => {
    const visible = selectedFilter === 'all' || s.section === selectedFilter;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    if (visible) {
      ctx.fillStyle = getSeatColor(s);
      if (s.status === 'available') {
        ctx.shadowColor = getSeatColor(s);
        ctx.shadowBlur  = s.section === 'ga' ? 6 : 4;
      } else {
        ctx.shadowBlur = 0;
      }
    } else {
      ctx.fillStyle  = '#161e2e';
      ctx.shadowBlur = 0;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

function updateAvailCount() {
  const av = seats.filter(s => s.status === 'available').length;
  document.getElementById('avail-count').textContent = av;
  // Update queue info
  const qi = document.getElementById('qi-released');
  const ql = document.getElementById('qi-left');
  if (qi) qi.textContent = totalReleased.toLocaleString();
  if (ql) ql.textContent = av.toLocaleString();
}

// ── DISAPPEAR ─────────────────────────────────────────────
function startDisappearing() {
  disappearInterval = setInterval(() => {
    if (gameOver) return;
    const avail = seats.filter(s => s.status === 'available');
    if (avail.length === 0) return;

    // Ramp up disappearing rate as time drops
    const urgency = 1 - (timerVal / 120);
    const count = Math.ceil(avail.length * (0.015 + urgency * 0.02)) + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      if (!avail.length) break;
      const idx = Math.floor(Math.random() * avail.length);
      avail[idx].status = 'taken';
      avail.splice(idx, 1);
    }
    updateAvailCount();
    drawVenue();

    if (count > 5) triggerPanicFlash();
  }, 750);
}

function triggerPanicFlash() {
  const el = document.createElement('div');
  el.className = 'panic-flash';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 400);
}

// ── CLICK HANDLER ─────────────────────────────────────────
canvas.addEventListener('click', e => {
  if (gameOver) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;

  let hit = null, minD = Infinity;
  seats.forEach(s => {
    if (s.status !== 'available') return;
    const d = Math.hypot(s.x - mx, s.y - my);
    if (d < s.r + 8 && d < minD) { minD = d; hit = s; }
  });
  if (!hit) return;

  // Grab `qty` nearby available seats in same section
  const avail = seats
    .filter(s => s.status === 'available' && s.section === hit.section)
    .sort((a, b) => Math.hypot(a.x - mx, a.y - my) - Math.hypot(b.x - mx, b.y - my));

  const toGrab = avail.slice(0, Math.min(qty, avail.length));
  if (!toGrab.length) return;

  toGrab.forEach(s => s.status = 'selected');
  addToCart(toGrab);
  drawVenue();

  // Show grab pop
  const pop = document.createElement('div');
  pop.className = 'grab-pop';
  pop.textContent = `+${toGrab.length} 🎟`;
  pop.style.left = (e.clientX - mapArea.getBoundingClientRect().left) + 'px';
  pop.style.top  = (e.clientY - mapArea.getBoundingClientRect().top)  + 'px';
  mapArea.appendChild(pop);
  setTimeout(() => pop.remove(), 1000);
});

// ── TOOLTIP ───────────────────────────────────────────────
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;

  let hit = null, minD = Infinity;
  seats.forEach(s => {
    if (s.status !== 'available') return;
    const d = Math.hypot(s.x - mx, s.y - my);
    if (d < s.r + 10 && d < minD) { minD = d; hit = s; }
  });

  const tip = document.getElementById('seat-tooltip');
  if (hit) {
    tip.style.display = 'block';
    tip.style.left = (mx + 14) + 'px';
    tip.style.top  = (my - 10) + 'px';
    const sec = SECTIONS.find(s => s.id === hit.section);
    tip.innerHTML = `<strong>${hit.label}</strong><br>$${sec.price} each · Click to grab ${qty} seat${qty > 1 ? 's' : ''}<br><span style="color:#9ca3af;font-size:11px">Total: $${sec.price * qty}</span>`;
  } else {
    tip.style.display = 'none';
  }
});

// ── CART ──────────────────────────────────────────────────
function addToCart(grabbed) {
  const sec = SECTIONS.find(s => s.id === grabbed[0].section);
  cart.push({ seats: grabbed, section: sec, total: grabbed.length * sec.price });
  updateCartUI();
}

function updateCartUI() {
  const total = cart.reduce((a, c) => a + c.seats.length, 0);
  document.getElementById('cart-count').textContent = total;
  document.getElementById('checkout-btn').disabled = (total === 0);
  renderCartPanel();
}

function renderCartPanel() {
  const panel = document.getElementById('cart-panel');
  if (!panel.classList.contains('open')) return;

  const totalSeats = cart.reduce((a, c) => a + c.seats.length, 0);
  const totalPrice = cart.reduce((a, c) => a + c.total, 0);

  let html = `<div class="cart-panel-title">🛒 Your Cart</div>`;
  if (cart.length === 0) {
    html += `<div style="font-size:13px;color:#6b7280;margin-top:8px">No tickets yet.<br>Click a blue dot to grab seats!</div>`;
  } else {
    cart.forEach(c => {
      html += `<div class="cart-item">
        <div class="cart-item-name">${c.section.label}</div>
        <div class="cart-item-price">${c.seats.length} ticket${c.seats.length > 1 ? 's' : ''} · $${c.total.toLocaleString()}</div>
      </div>`;
    });
    html += `<div class="cart-total">
      <div class="cart-total-label">${totalSeats} ticket${totalSeats > 1 ? 's' : ''}</div>
      <div class="cart-total-val">$${totalPrice.toLocaleString()}</div>
    </div>`;
    html += `<button class="checkout-btn" onclick="goCheckout()" style="margin-top:8px">Checkout →</button>`;
  }
  panel.innerHTML = html;
}

function toggleCart() {
  const panel = document.getElementById('cart-panel');
  panel.classList.toggle('open');
  renderCartPanel();
}

// ── QUANTITY ──────────────────────────────────────────────
function changeQty(d) {
  qty = Math.max(1, Math.min(8, qty + d));
  document.getElementById('qty-val').textContent = qty;
}

// ── SECTION FILTER ────────────────────────────────────────
function buildFilters() {
  const wrap = document.getElementById('section-filter');
  wrap.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn active';
  allBtn.textContent = 'All sections';
  allBtn.onclick = () => setFilter('all', allBtn);
  wrap.appendChild(allBtn);

  SECTIONS.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.textContent = `${s.label} · $${s.price}`;
    btn.onclick = () => setFilter(s.id, btn);
    wrap.appendChild(btn);
  });
}

function setFilter(id, btn) {
  selectedFilter = id;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  drawVenue();
}

// ── TIMER ─────────────────────────────────────────────────
function startTimer() {
  timerVal = 120;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timerVal--;
    updateTimerDisplay();
    if (timerVal <= 0) {
      clearInterval(timerInterval);
      clearInterval(disappearInterval);
      gameOver = true;
      goCheckout(true);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(timerVal / 60);
  const s = timerVal % 60;
  const el = document.getElementById('timer-val');
  el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  if (timerVal <= 20) el.classList.add('urgent');
}

// ── CHECKOUT ──────────────────────────────────────────────
function goCheckout(timeout = false) {
  if (!gameOver) {
    clearInterval(timerInterval);
    clearInterval(disappearInterval);
    gameOver = true;
  }

  const totalSeats = cart.reduce((a, c) => a + c.seats.length, 0);
  const totalPrice = cart.reduce((a, c) => a + c.total, 0);
  const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
  const speed = totalSeats > 0 ? Math.round(elapsed / totalSeats) + 's' : '—';
  const fees = Math.round(totalPrice * 0.28);
  const grand = totalPrice + fees;

  showScreen('checkout-screen');

  if (timeout) {
    document.getElementById('timeout-msg').style.display = 'block';
    document.getElementById('co-icon').textContent  = totalSeats > 0 ? '⏰' : '😢';
    document.getElementById('co-title').textContent = totalSeats > 0 ? "Time's up — but you grabbed some!" : "Time's up!";
    document.getElementById('co-sub').textContent   = totalSeats > 0 ? 'Your cart was saved at cutoff.' : 'Better luck next time...';
  } else {
    document.getElementById('timeout-msg').style.display = 'none';
    document.getElementById('co-icon').textContent  = '🎉';
    document.getElementById('co-title').textContent = 'You got them!';
    document.getElementById('co-sub').textContent   = 'Order confirmed. Here\'s your summary:';
  }

  // Order breakdown
  let orderHTML = '';
  if (cart.length === 0) {
    orderHTML = '<div class="order-row"><span class="label">No tickets in cart</span><span>$0</span></div>';
  } else {
    cart.forEach(c => {
      orderHTML += `<div class="order-row"><span class="label">${c.section.label} ×${c.seats.length}</span><span>$${c.total.toLocaleString()}</span></div>`;
    });
    orderHTML += `<div class="order-row"><span class="label">Service & facility fees</span><span>$${fees.toLocaleString()}</span></div>`;
    orderHTML += `<div class="order-row"><span class="label">Total</span><span>$${grand.toLocaleString()}</span></div>`;
  }
  document.getElementById('order-box').innerHTML = orderHTML;

  // Score cards
  document.getElementById('sc-seats').textContent = totalSeats;
  document.getElementById('sc-speed').textContent = speed;
  let rank = '😅 Newbie';
  if (totalSeats >= 12) rank = '🏆 Legend';
  else if (totalSeats >= 7) rank = '🔥 Pro';
  else if (totalSeats >= 3) rank = '⚡ Quick';
  document.getElementById('sc-rank').textContent = rank;
}

// ── WAITING ROOM QUEUE COUNTDOWN ─────────────────────────
function startQueue() {
  let progress = 2;
  let released = 0;
  const totalTickets = 1200;

  queueInterval = setInterval(() => {
    const drop = Math.floor(Math.random() * 40 + 20);
    queueNum = Math.max(0, queueNum - drop);
    released += Math.floor(Math.random() * 15 + 5);
    released = Math.min(released, totalTickets);

    document.getElementById('queue-num').textContent = queueNum.toLocaleString();
    document.getElementById('qi-released').textContent = released.toLocaleString();
    document.getElementById('qi-left').textContent = Math.max(0, totalTickets - released).toLocaleString();

    progress = Math.min(98, progress + (Math.random() * 3.5 + 1));
    document.getElementById('q-bar').style.width = progress + '%';

    const wait = Math.max(0, Math.round(queueNum / 65));
    document.getElementById('q-progress-text').textContent =
      queueNum > 0 ? `Estimated wait: ${wait} min${wait !== 1 ? 's' : ''}…` : 'Almost your turn!';

    if (queueNum <= 0 || progress >= 98) {
      clearInterval(queueInterval);
      document.getElementById('queue-num').textContent   = '🎟';
      document.getElementById('queue-label').textContent  = "It's your turn!";
      document.getElementById('q-progress-text').textContent = 'Entering ticket selection now…';
      document.getElementById('enter-btn').style.display  = 'block';
      document.getElementById('dots-loader').style.display = 'none';
    }
  }, 380);
}

// ── ENTER VENUE ───────────────────────────────────────────
function enterVenue() {
  showScreen('venue-screen');
  sizeCanvas();
  buildSeats();
  buildFilters();
  drawVenue();
  startDisappearing();
  startTimer();
  startTime = Date.now();
  gameStarted = true;
  gameOver = false;
}

// ── RESET ─────────────────────────────────────────────────
function resetGame() {
  cart         = [];
  qty          = 2;
  timerVal     = 120;
  queueNum     = Math.floor(600 + Math.random() * 600);
  gameStarted  = false;
  gameOver     = false;
  selectedFilter = 'all';

  clearInterval(timerInterval);
  clearInterval(disappearInterval);
  clearInterval(queueInterval);

  document.getElementById('queue-num').textContent       = queueNum.toLocaleString();
  document.getElementById('queue-label').textContent      = 'people ahead of you';
  document.getElementById('q-bar').style.width           = '2%';
  document.getElementById('q-progress-text').textContent = 'Estimated wait: calculating…';
  document.getElementById('enter-btn').style.display     = 'none';
  document.getElementById('dots-loader').style.display   = 'flex';
  document.getElementById('timer-val').textContent       = '2:00';
  document.getElementById('timer-val').classList.remove('urgent');
  document.getElementById('cart-count').textContent      = '0';
  document.getElementById('checkout-btn').disabled       = true;
  document.getElementById('cart-panel').classList.remove('open');
  document.getElementById('timeout-msg').style.display   = 'none';
  document.getElementById('qi-released').textContent     = '—';
  document.getElementById('qi-left').textContent         = '—';

  showScreen('waiting-screen');
  startQueue();
}

// ── UTILS ─────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

window.addEventListener('resize', () => {
  if (gameStarted && !gameOver) {
    sizeCanvas();
    buildSeats();
    buildFilters();
    drawVenue();
  }
});

// ── BOOT ─────────────────────────────────────────────────
startQueue();