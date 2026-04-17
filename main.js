/* ===== CONSTANTS ===== */
const CARD_WIDTH  = 150;
const CARD_GAP    = 10;
const CARD_SLOT   = CARD_WIDTH + CARD_GAP; // 160px per item slot
const WINNER_IDX  = 52;                    // winner is always at position 52
const TOTAL_ITEMS = 65;                    // total cards in strip

/* ===== RARITY CONFIG ===== */
const RARITY = {
  gray:   { label: 'Обычный',     bg: '#F1EFE8', text: '#5F5E5A', border: '#d4d0c7' },
  blue:   { label: 'Редкий',      bg: '#E6F1FB', text: '#185FA5', border: '#a8c8f0' },
  purple: { label: 'Эпический',   bg: '#EEEDFE', text: '#534AB7', border: '#b0acf5' },
  gold:   { label: 'Легендарный', bg: '#FAEEDA', text: '#854F0B', border: '#e8c06a' },
};

/* ===== PRIZES ===== */
const PRIZES = [
  // Common — gray
  { name: 'Glock-18 | Rust Coat',       rarity: 'gray',   weight: 50, icon: '🔫' },
  { name: 'MP9 | Sand Dashed',           rarity: 'gray',   weight: 48, icon: '🔫' },
  { name: 'P250 | Sand Dune',            rarity: 'gray',   weight: 45, icon: '🔫' },
  { name: 'FAMAS | Colony',              rarity: 'gray',   weight: 42, icon: '🔫' },
  { name: 'Tec-9 | Sandstorm',           rarity: 'gray',   weight: 40, icon: '🔫' },

  // Rare — blue
  { name: 'AK-47 | Safari Mesh',         rarity: 'blue',   weight: 25, icon: '🎯' },
  { name: 'M4A4 | Urban DDPAT',          rarity: 'blue',   weight: 22, icon: '🎯' },
  { name: 'AWP | Safari Mesh',           rarity: 'blue',   weight: 20, icon: '🎯' },
  { name: 'SG 553 | Waves Perforated',   rarity: 'blue',   weight: 18, icon: '🎯' },

  // Epic — purple
  { name: 'Desert Eagle | Hypnotic',     rarity: 'purple', weight: 10, icon: '💜' },
  { name: 'AK-47 | Redline',             rarity: 'purple', weight:  8, icon: '💜' },
  { name: 'M4A1-S | Master Piece',       rarity: 'purple', weight:  6, icon: '💜' },

  // Legendary — gold
  { name: 'AWP | Dragon Lore',           rarity: 'gold',   weight:  2, icon: '⭐' },
  { name: 'Butterfly Knife | Fade',      rarity: 'gold',   weight:  1, icon: '🗡️' },
];

/* ===== CASES ===== */
const CASES = [
  { id: 1, name: 'Стартовый кейс', price: 100, icon: '📦', color: '#4a9eda' },
  { id: 2, name: 'Премиум кейс',   price: 300, icon: '🎁', color: '#9b59b6' },
  { id: 3, name: 'Элитный кейс',   price: 500, icon: '💼', color: '#e8a319' },
];

/* ===== STATE ===== */
let balance      = 1000;
let selectedCase = null;
let isAnimating  = false;

/* ===== WEIGHTED RANDOM ===== */
function pickPrize() {
  const total = PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of PRIZES) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return PRIZES[PRIZES.length - 1];
}

/* ===== DOM HELPERS ===== */
function applyRarityStyle(el, rarity) {
  const r = RARITY[rarity];
  el.style.background   = r.bg;
  el.style.borderColor  = r.border;
  el.style.color        = r.text;
}

function makeStripCard(prize) {
  const r   = RARITY[prize.rarity];
  const div = document.createElement('div');
  div.className = 'strip-card';
  applyRarityStyle(div, prize.rarity);
  div.innerHTML = `
    <div class="card-icon">${prize.icon}</div>
    <div class="card-name" style="color:${r.text}">${prize.name}</div>
  `;
  return div;
}

/* ===== BUILD STRIP ===== */
// Place `winner` at WINNER_IDX, everything else is random.
// Returns the winner so the caller can use it for the result card.
function buildStrip(winner) {
  const strip = document.getElementById('strip');
  const track = document.getElementById('strip-track');

  // Reset transform instantly (no transition)
  strip.style.transition = 'none';
  const startX = track.offsetWidth / 2 - CARD_WIDTH / 2;
  strip.style.transform = `translateX(${startX}px)`;

  // Build 42 cards
  strip.innerHTML = '';
  for (let i = 0; i < TOTAL_ITEMS; i++) {
    const prize = (i === WINNER_IDX) ? winner : pickPrize();
    strip.appendChild(makeStripCard(prize));
  }
}

/* ===== ANIMATE STRIP ===== */
function animateStrip(onDone) {
  const strip = document.getElementById('strip');
  const track = document.getElementById('strip-track');

  const winnerCenter = WINNER_IDX * CARD_SLOT + CARD_WIDTH / 2;
  const finalX       = track.offsetWidth / 2 - winnerCenter;

  // getBoundingClientRect forces the browser to commit the current transform
  // before we apply the transition — avoids the "snap then animate" glitch.
  void strip.getBoundingClientRect();

  strip.style.transition = 'transform 7s cubic-bezier(0.08, 0.82, 0.17, 1)';
  strip.style.transform  = `translateX(${finalX}px)`;

  setTimeout(onDone, 7200);
}

/* ===== SHOW RESULT MODAL ===== */
function showResult(prize) {
  const r = RARITY[prize.rarity];

  const card = document.getElementById('result-card');
  applyRarityStyle(card, prize.rarity);

  document.getElementById('result-icon').textContent   = prize.icon;
  document.getElementById('result-rarity').textContent = r.label;
  document.getElementById('result-rarity').style.color = r.text;
  document.getElementById('result-name').textContent   = prize.name;
  document.getElementById('result-name').style.color   = r.text;
  document.getElementById('btn-close').style.color     = r.text;

  document.getElementById('result-overlay').classList.add('open');
}

/* ===== RENDER CASES ===== */
function renderCases() {
  const grid = document.getElementById('cases-grid');
  CASES.forEach(c => {
    const el = document.createElement('div');
    el.className = 'case-card';
    el.dataset.id = c.id;
    el.style.setProperty('--case-color', c.color);
    el.innerHTML = `
      <span class="case-icon">${c.icon}</span>
      <div class="case-name">${c.name}</div>
      <div class="case-price">${c.price} монет</div>
    `;
    el.addEventListener('click', () => onCaseClick(c, el));
    grid.appendChild(el);
  });
}

/* ===== RENDER PRIZES GRID ===== */
function renderPrizesGrid() {
  const grid   = document.getElementById('prizes-grid');
  const sorted = [...PRIZES].sort((a, b) => b.weight - a.weight); // common first
  sorted.forEach(p => {
    const r  = RARITY[p.rarity];
    const el = document.createElement('div');
    el.className = 'prize-item';
    applyRarityStyle(el, p.rarity);
    el.innerHTML = `
      <span class="prize-icon">${p.icon}</span>
      <div class="prize-name" style="color:${r.text}">${p.name}</div>
      <div class="prize-rarity" style="color:${r.text}">${r.label}</div>
    `;
    grid.appendChild(el);
  });
}

/* ===== UPDATE BALANCE DISPLAY ===== */
function updateBalance() {
  document.getElementById('balance').textContent = balance.toLocaleString('ru-RU');
}

/* ===== CASE CLICK HANDLER ===== */
function onCaseClick(c, el) {
  if (isAnimating) return;

  selectedCase = c;

  // Highlight selected card
  document.querySelectorAll('.case-card').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');

  // Update open button
  const btn = document.getElementById('btn-open');
  btn.disabled = false;
  btn.textContent = `Открыть за ${c.price} монет`;

  // Preview strip with random winner
  buildStrip(pickPrize());
}

/* ===== OPEN BUTTON HANDLER ===== */
function onOpen() {
  if (!selectedCase || isAnimating) return;

  if (balance < selectedCase.price) {
    alert('Недостаточно монет!');
    return;
  }

  isAnimating = true;
  balance -= selectedCase.price;
  updateBalance();

  const btn = document.getElementById('btn-open');
  btn.disabled = true;
  btn.textContent = 'Открывается…';

  // Pick the winner BEFORE building the strip
  const winner = pickPrize();
  buildStrip(winner);

  // Double rAF ensures the "reset" transform is painted before we animate
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      animateStrip(() => {
        isAnimating = false;
        showResult(winner);
      });
    });
  });
}

/* ===== CLOSE MODAL HANDLER ===== */
function onClose() {
  document.getElementById('result-overlay').classList.remove('open');

  if (selectedCase) {
    const btn = document.getElementById('btn-open');
    btn.disabled = false;
    btn.textContent = `Открыть за ${selectedCase.price} монет`;
    buildStrip(pickPrize()); // refresh strip preview
  }
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  renderCases();
  renderPrizesGrid();
  updateBalance();

  document.getElementById('btn-open').addEventListener('click', onOpen);
  document.getElementById('btn-close').addEventListener('click', onClose);
});
