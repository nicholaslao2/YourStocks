/* ═══════════════════════════════════════════════════
   script.js  —  YourStocks Wireframe
   Purpose: Page behaviour, dynamic rendering, interactions
═══════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────
   1. TOAST NOTIFICATION
   Shows a temporary message at the bottom of screen
───────────────────────────────────────────────── */

let toastTimer = null;

/**
 * Display a brief toast message.
 * @param {string} message - Text to show
 * @param {number} duration - How long to show it (ms)
 */
function showToast(message, duration = 2200) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  // Clear any existing timer so messages don't stack
  clearTimeout(toastTimer);

  toast.textContent = message;
  toast.classList.add('visible');

  toastTimer = setTimeout(() => {
    toast.classList.remove('visible');
  }, duration);
}


/* ─────────────────────────────────────────────────
   2. BOTTOM NAV FEEDBACK
   Highlights the tapped nav button and shows a toast
───────────────────────────────────────────────── */

const NAV_LABELS = {
  dashboard: '🏠 Dashboard',
  markets:   '📊 Markets',
  simulate:  '🎮 Simulated Trading',
  alerts:    '🔔 Alerts',
  settings:  '⚙️ Settings',
};

/**
 * Called when a nav bar button is tapped.
 * @param {string} page - key from NAV_LABELS
 */
function navTo(page) {
  showToast(`Navigating to ${NAV_LABELS[page] || page}…`);

  // Highlight the active button in every nav bar that has this page's button
  document.querySelectorAll('.nav-bar').forEach(bar => {
    bar.querySelectorAll('.nav-icon').forEach((btn, index) => {
      const pages = ['dashboard', 'markets', 'simulate', 'alerts', 'settings'];
      btn.classList.toggle('active', pages[index] === page);
    });
  });
}


/* ─────────────────────────────────────────────────
   3. TOGGLE SWITCHES
   Flip on/off state for notification toggles
───────────────────────────────────────────────── */

/**
 * Toggle a switch element between on/off.
 * @param {HTMLElement} el - The .toggle element
 */
function toggleSwitch(el) {
  const isOn = el.classList.contains('on');
  el.classList.toggle('on', !isOn);
  el.classList.toggle('off', isOn);

  // Derive a label from the parent row's text content
  const label = el.closest('.toggle-row')
    ?.querySelector('.ui-text')?.textContent?.trim() || 'Setting';

  showToast(`${label}: ${isOn ? 'OFF' : 'ON'}`);
}


/* ─────────────────────────────────────────────────
   4. CHIP SELECTOR (Risk Profile Questions)
   Lets the user pick one chip per question group
───────────────────────────────────────────────── */

/**
 * Highlight the selected chip within its .chip-row group.
 * @param {HTMLElement} chip - The clicked chip
 */
function selectChip(chip) {
  const row = chip.closest('.chip-row');
  if (!row) return;

  // Deselect siblings
  row.querySelectorAll('.chip').forEach(c => {
    c.style.outline = 'none';
    c.style.boxShadow = 'none';
  });

  // Highlight selected
  chip.style.outline = '2px solid var(--accent)';
  chip.style.boxShadow = '0 0 6px rgba(0,229,160,0.35)';

  showToast(`Selected: "${chip.textContent}"`);
}


/* ─────────────────────────────────────────────────
   5. TIMEFRAME SELECTOR (Stock Detail)
   Switches active timeframe chip
───────────────────────────────────────────────── */

/**
 * Set the active timeframe chip.
 * @param {HTMLElement} chip - The clicked timeframe chip
 */
function setTimeframe(chip) {
  const row = chip.closest('.timeframe-row');
  if (!row) return;

  row.querySelectorAll('.chip').forEach(c => {
    c.classList.remove('active-tf', 'chip-green');
    c.classList.add('chip-dim');
  });

  chip.classList.remove('chip-dim');
  chip.classList.add('chip-green', 'active-tf');

  showToast(`Chart timeframe: ${chip.dataset.tf}`);
}


/* ─────────────────────────────────────────────────
   6. MINI BAR CHART RENDERER
   Injects animated bar chart HTML into a .mini-chart container
───────────────────────────────────────────────── */

/**
 * Data sets for different charts (height percentage 10–95).
 */
const CHART_DATA = {
  dashboard: [30, 45, 38, 55, 70, 60, 80, 90, 78, 95],
  risk:      [40, 60, 50, 75, 85, 70, 95, 65, 80, 90],
};

/**
 * Render bars into a mini chart container.
 * @param {string} containerId - id of the .mini-chart element
 * @param {number[]} data      - array of heights (0–100)
 */
function renderMiniChart(containerId, data) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = data
    .map((h, i) => {
      // Classify as up or down based on change from previous bar
      const isUp = i === 0 || data[i] >= data[i - 1];
      return `<div class="bar ${isUp ? 'bar-up' : 'bar-dn'}"
                   style="height:${h}%; animation-delay:${i * 40}ms"></div>`;
    })
    .join('');
}


/* ─────────────────────────────────────────────────
   7. CANDLESTICK CHART RENDERER
   Injects candle SVG-like elements into a container
───────────────────────────────────────────────── */

/**
 * Candle definitions: { up: bool, bodyHeight: px }
 */
const CANDLE_SETS = {
  detail: [
    { up: true,  bodyHeight: 20 },
    { up: false, bodyHeight: 14 },
    { up: true,  bodyHeight: 24 },
    { up: true,  bodyHeight: 18 },
    { up: false, bodyHeight: 10 },
    { up: true,  bodyHeight: 28 },
    { up: true,  bodyHeight: 32 },
  ],
  sim: [
    { up: true,  bodyHeight: 16 },
    { up: false, bodyHeight: 20 },
    { up: true,  bodyHeight: 30 },
    { up: true,  bodyHeight: 24 },
    { up: false, bodyHeight: 18 },
  ],
};

/**
 * Render candlestick chart elements into a container.
 * @param {string} containerId - id of .candlestick-area element
 * @param {Array}  candles     - array of { up, bodyHeight }
 */
function renderCandlesticks(containerId, candles) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = candles
    .map(c => {
      const colour = c.up ? 'var(--accent)' : 'var(--red)';
      return `
        <div class="candle">
          <div class="wick" style="background:${colour}"></div>
          <div class="body" style="height:${c.bodyHeight}px; background:${colour}"></div>
          <div class="wick" style="background:${colour}"></div>
        </div>`;
    })
    .join('');
}


/* ─────────────────────────────────────────────────
   8. LIVE PRICE TICKER (Dashboard)
   Randomly nudges portfolio value every few seconds
   to simulate real-time data updates
───────────────────────────────────────────────── */

const TICKERS = [
  { id: 'tick-aapl', base: 189.40 },
  { id: 'tick-tsla', base: 241.10 },
  { id: 'tick-nvda', base: 875.00 },
];

/**
 * Nudge price by a small random delta.
 * @param {number} base  - Starting price
 * @returns {number}
 */
function nudgePrice(base) {
  const delta = (Math.random() - 0.48) * base * 0.002;
  return Math.max(0, base + delta);
}

// Track current prices so changes compound
const currentPrices = {};
TICKERS.forEach(t => { currentPrices[t.id] = t.base; });

/**
 * Update price elements in the dashboard holdings list.
 * Only runs if the elements exist in the DOM.
 */
function tickPrices() {
  TICKERS.forEach(t => {
    const el = document.getElementById(t.id);
    if (!el) return;

    const prev = currentPrices[t.id];
    const next = nudgePrice(prev);
    currentPrices[t.id] = next;

    el.textContent = `$${next.toFixed(2)}`;
    el.style.color = next >= prev ? 'var(--accent)' : 'var(--red)';
  });
}

// Attach live ids to dashboard list prices
function attachTickerIds() {
  const rows = document.querySelectorAll('#screen-dashboard .list-item');
  const ids = ['tick-aapl', 'tick-tsla', 'tick-nvda'];
  rows.forEach((row, i) => {
    const priceEl = row.querySelector('.list-right div');
    if (priceEl && ids[i]) priceEl.id = ids[i];
  });
}


/* ─────────────────────────────────────────────────
   9. GAUGE NEEDLE ANIMATION
   Animates risk gauge needle on first view
───────────────────────────────────────────────── */

function animateGaugeNeedles() {
  // Start at 0% and animate to final position
  const needles = document.querySelectorAll('.gauge-needle');
  needles.forEach(needle => {
    needle.style.left = '0%';
    setTimeout(() => {
      needle.style.left = '60%';
    }, 400);
  });
}


/* ─────────────────────────────────────────────────
   10. INITIALISATION
   Runs once the DOM is fully loaded
───────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {

  // Render charts
  renderMiniChart('chart-dashboard', CHART_DATA.dashboard);
  renderMiniChart('chart-risk', CHART_DATA.risk);

  // Render candlesticks
  renderCandlesticks('candles-detail', CANDLE_SETS.detail);
  renderCandlesticks('candles-sim', CANDLE_SETS.sim);

  // Attach ticker ids and start live ticking every 2.5 seconds
  attachTickerIds();
  setInterval(tickPrices, 2500);

  // Animate gauge needles after short delay
  setTimeout(animateGaugeNeedles, 600);

  // Greet
  console.log('%cYourStocks Wireframe loaded ✓', 'color:#00e5a0; font-family:monospace; font-size:14px;');
});
