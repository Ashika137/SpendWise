/* ============================================================
   SPENDWISE — script.js
   All app logic: data, real-time processing, chart, UI render
   ============================================================ */

/* ---------- CATEGORY DEFINITIONS ---------- */
const CATEGORIES = {
  food:          { emoji: '🍔', color: '#ffd166', bg: 'rgba(255,209,102,0.15)', label: 'Food' },
  transport:     { emoji: '🚗', color: '#7affb8', bg: 'rgba(122,255,184,0.15)', label: 'Transport' },
  shopping:      { emoji: '🛍️', color: '#c084fc', bg: 'rgba(192,132,252,0.15)', label: 'Shopping' },
  health:        { emoji: '💊', color: '#f87171', bg: 'rgba(248,113,113,0.15)', label: 'Health' },
  entertainment: { emoji: '🎮', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  label: 'Entertainment' },
  utilities:     { emoji: '⚡', color: '#d4f57a', bg: 'rgba(212,245,122,0.15)', label: 'Utilities' },
  other:         { emoji: '📦', color: '#9ca3af', bg: 'rgba(156,163,175,0.15)', label: 'Other' },
};

/* ---------- LOAD SAVED DATA ---------- */
// localStorage keeps data even after the browser tab is closed
let expenses = JSON.parse(localStorage.getItem('sw_expenses') || '[]');
let budget   = parseFloat(localStorage.getItem('sw_budget')   || '1000');

/* ---------- BUDGET INPUT LISTENER ---------- */
const budgetInput = document.getElementById('budget-input');
budgetInput.value = budget;
budgetInput.addEventListener('input', () => {
  budget = parseFloat(budgetInput.value) || 0;
  localStorage.setItem('sw_budget', budget);
  render();
});

/* ============================================================
   REAL-TIME DATA PROCESSING
   setInterval runs a function repeatedly on a timer.
   Here it runs every 1000ms (1 second) — this is what makes
   it "real-time": the app continuously reads and processes
   live data (current time + current expenses) without any
   user interaction required.
   ============================================================ */
setInterval(() => {
  updateClock();      // update the live clock display
  updateInsights();   // recalculate time-based spending metrics
}, 1000);

/* ---------- REAL-TIME: LIVE CLOCK ---------- */
// Reads the current system time every second and displays it
function updateClock() {
  const now = new Date();
  document.getElementById('live-clock').textContent =
    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/* ---------- REAL-TIME: SPENDING INSIGHTS ---------- */
// Uses the current date to calculate financial metrics that
// change automatically as the month progresses — no user
// input needed. This is the core of real-time data processing.
function updateInsights() {
  const now         = new Date();
  const dayOfMonth  = now.getDate();                               // e.g. 15
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); // e.g. 31
  const daysLeft    = daysInMonth - dayOfMonth;                    // e.g. 16

  const total      = expenses.reduce((sum, e) => sum + e.amount, 0);
  const dailyRate  = dayOfMonth > 0 ? total / dayOfMonth : 0;     // avg spend per day so far
  const projection = dailyRate * daysInMonth;                      // projected end-of-month total

  document.getElementById('insight-day').textContent        = `${dayOfMonth} / ${daysInMonth}`;
  document.getElementById('insight-daily').textContent      = fmt(dailyRate);
  document.getElementById('insight-projection').textContent = fmt(projection);
  document.getElementById('insight-daysleft').textContent   = `${daysLeft} days`;
}

/* ============================================================
   ADD EXPENSE
   ============================================================ */
function addExpense() {
  const desc   = document.getElementById('inp-desc').value.trim();
  const amount = parseFloat(document.getElementById('inp-amount').value);
  const cat    = document.getElementById('inp-cat').value;

  // Validation — highlight inputs red if empty or invalid
  if (!desc || isNaN(amount) || amount <= 0) {
    document.getElementById('inp-desc').style.borderColor =
      desc ? '' : 'var(--danger)';
    document.getElementById('inp-amount').style.borderColor =
      (!isNaN(amount) && amount > 0) ? '' : 'var(--danger)';
    setTimeout(() => {
      document.getElementById('inp-desc').style.borderColor   = '';
      document.getElementById('inp-amount').style.borderColor = '';
    }, 1500);
    return;
  }

  // Add the new expense to the front of the array
  expenses.unshift({
    id:     Date.now(), // unique ID using timestamp
    desc,
    amount,
    cat,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  });

  // Save to localStorage so data survives page refresh
  localStorage.setItem('sw_expenses', JSON.stringify(expenses));

  // Clear form fields
  document.getElementById('inp-desc').value   = '';
  document.getElementById('inp-amount').value = '';

  render();
}

/* ============================================================
   DELETE EXPENSE
   ============================================================ */
function deleteExpense(id) {
  // Filter out the expense with the matching ID
  expenses = expenses.filter(e => e.id !== id);
  localStorage.setItem('sw_expenses', JSON.stringify(expenses));
  render();
}

/* ============================================================
   RENDER — redraws the entire UI whenever data changes
   ============================================================ */
function render() {
  const total     = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budget - total;
  const pct       = budget > 0 ? Math.min((total / budget) * 100, 100) : 0;

  /* --- Stat Cards --- */
  document.getElementById('stat-total').textContent     = fmt(total);
  document.getElementById('stat-remaining').textContent = fmt(Math.max(remaining, 0));
  document.getElementById('stat-txns').textContent      = expenses.length;

  // Change remaining balance colour based on how much is left
  const remEl = document.getElementById('stat-remaining');
  remEl.className = 'stat-value ' +
    (remaining < 0 ? 'red' : remaining < budget * 0.2 ? 'yellow' : 'green');

  /* --- Budget Progress Bar --- */
  const bar = document.getElementById('budget-bar');
  bar.style.width      = pct + '%';
  bar.style.background = pct >= 100 ? 'var(--danger)' :
                         pct >= 80  ? 'var(--warning)' : 'var(--accent2)';

  /* --- Budget Status Text --- */
  const statusEl = document.getElementById('budget-status');
  if (total === 0) {
    statusEl.textContent = 'No expenses yet — budget intact.';
    statusEl.className   = 'budget-status ok';
  } else if (pct >= 100) {
    statusEl.textContent = `Over by ${fmt(Math.abs(remaining))} — ${pct.toFixed(0)}% used.`;
    statusEl.className   = 'budget-status over';
  } else if (pct >= 80) {
    statusEl.textContent = `${pct.toFixed(0)}% used — ${fmt(remaining)} remaining. Getting close!`;
    statusEl.className   = 'budget-status near';
  } else {
    statusEl.textContent = `${pct.toFixed(0)}% used — ${fmt(remaining)} remaining.`;
    statusEl.className   = 'budget-status ok';
  }

  /* --- Alert Banners --- */
  const warnEl   = document.getElementById('alert-warning');
  const dangerEl = document.getElementById('alert-danger');
  warnEl.classList.toggle('show',   pct >= 80 && pct < 100);
  dangerEl.classList.toggle('show', pct >= 100);

  if (pct >= 80 && pct < 100)
    document.getElementById('alert-warning-text').textContent =
      `You've used ${pct.toFixed(0)}% of your budget. Only ${fmt(remaining)} left.`;

  if (pct >= 100)
    document.getElementById('alert-danger-text').textContent =
      `Budget exceeded by ${fmt(Math.abs(remaining))}! Review your expenses.`;

  /* --- Remaining card colour --- */
  document.getElementById('card-remaining').className =
    'stat-card ' + (remaining < 0 ? 'danger' : remaining < budget * 0.2 ? 'warning' : 'safe');

  /* --- Chart --- */
  renderChart();

  /* --- Expense List --- */
  document.getElementById('count-badge').textContent =
    `${expenses.length} item${expenses.length !== 1 ? 's' : ''}`;

  const listEl = document.getElementById('expense-list');

  if (expenses.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="icon">💸</div>
        No expenses yet. Add one above!
      </div>`;
    return;
  }

  listEl.innerHTML = expenses.map(e => {
    const c = CATEGORIES[e.cat] || CATEGORIES.other;
    return `
      <div class="expense-item">
        <div class="cat-dot" style="background:${c.bg}">${c.emoji}</div>
        <div class="expense-info">
          <div class="expense-name">${escHtml(e.desc)}</div>
          <div class="expense-meta">${c.label} &nbsp;·&nbsp; ${e.date}</div>
        </div>
        <div class="expense-amount">-${fmt(e.amount)}</div>
        <button class="btn-delete" onclick="deleteExpense(${e.id})">✕</button>
      </div>`;
  }).join('');

  // Also refresh insights whenever expenses change
  updateInsights();
}

/* ============================================================
   DATA VISUALIZATION — Doughnut Chart (canvas API)
   Groups expenses by category and draws a colour-coded
   doughnut chart with a matching legend.
   ============================================================ */
function renderChart() {
  const canvas = document.getElementById('cat-chart');
  const ctx    = canvas.getContext('2d');
  const noData = document.getElementById('no-data-msg');
  const legend = document.getElementById('chart-legend');

  // Group spending totals by category
  const totals = {};
  expenses.forEach(e => {
    totals[e.cat] = (totals[e.cat] || 0) + e.amount;
  });

  const keys  = Object.keys(totals);
  const total = Object.values(totals).reduce((s, v) => s + v, 0);

  // Show placeholder message if no data yet
  if (keys.length === 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    noData.style.display = 'block';
    legend.innerHTML     = '';
    return;
  }
  noData.style.display = 'none';

  // Draw the doughnut chart using the Canvas 2D API
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;
  const r  = Math.min(cx, cy) - 10; // outer radius
  const ir = r * 0.55;              // inner radius (creates the doughnut hole)

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let startAngle = -Math.PI / 2; // start drawing from the top

  keys.forEach(key => {
    const cat   = CATEGORIES[key] || CATEGORIES.other;
    const slice = (totals[key] / total) * (2 * Math.PI); // angle for this slice

    // Draw the slice
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = cat.color;
    ctx.fill();

    startAngle += slice;
  });

  // Draw the inner circle to create the doughnut hole
  ctx.beginPath();
  ctx.arc(cx, cy, ir, 0, 2 * Math.PI);
  ctx.fillStyle = '#161920'; // matches --surface variable
  ctx.fill();

  // Draw total amount in the centre of the chart
  const total2 = expenses.reduce((s, e) => s + e.amount, 0);
  ctx.fillStyle   = '#e8eaf0';
  ctx.font        = 'bold 14px Syne, sans-serif';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fmt(total2), cx, cy);

  // Build the legend next to the chart
  legend.innerHTML = keys.map(key => {
    const cat = CATEGORIES[key] || CATEGORIES.other;
    const pct = ((totals[key] / total) * 100).toFixed(1);
    return `
      <div class="legend-item">
        <div class="legend-dot" style="background:${cat.color}"></div>
        <span class="legend-label">${cat.emoji} ${cat.label}</span>
        <span class="legend-pct">${pct}%</span>
      </div>`;
  }).join('');
}

/* ============================================================
   HELPER FUNCTIONS
   ============================================================ */

// Format a number as USD currency: 1234.5 → "$1,234.50"
function fmt(n) {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Sanitize user input to prevent XSS (cross-site scripting)
function escHtml(s) {
  return s
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

/* ============================================================
   KEYBOARD SHORTCUT — press Enter to add expense
   ============================================================ */
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' &&
     (e.target.id === 'inp-desc' || e.target.id === 'inp-amount')) {
    addExpense();
  }
});

/* ============================================================
   INITIALISE — run everything on page load
   ============================================================ */
updateClock();    // show clock immediately (before first interval tick)
updateInsights(); // show insights immediately
render();         // render saved expenses from localStorage
