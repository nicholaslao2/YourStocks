/**
 * YourStocks Wireframe — script.js
 * Handles: modal interactions, architecture node clicks,
 *          ticker animation, scroll effects, active nav highlighting
 */

// ══════════════════════════════════════════════════════════════
// PAGE DATA — details for each page modal
// ══════════════════════════════════════════════════════════════
const PAGE_DATA = {
  auth: {
    title: "P1 · Authentication",
    sub: "Entry point for all users. Handles account creation, secure login, and biometric authentication.",
    features: ["Account registration", "Email & password login", "Biometric login (Face ID / fingerprint)", "2FA (Two-Factor Authentication)", "Secure encrypted session"],
    linkedTo: ["dashboard"],
    inputs: ["Email address", "Password", "Biometric data"],
    outputs: ["Auth token (JWT)", "Session state", "Redirect to Dashboard"]
  },
  dashboard: {
    title: "P2 · Dashboard (Hub)",
    sub: "The central hub of the platform. Provides a unified view of portfolio performance, real-time prices, and alerts.",
    features: ["Portfolio value summary", "Profit/Loss (P&L) analytics", "Real-time price tracking", "Watchlist overview", "Price alerts & notifications", "Custom dashboard layouts", "Navigation to all sections"],
    linkedTo: ["portfolio", "insights", "tools", "learning", "security"],
    inputs: ["Live market data (API)", "User portfolio", "Alert preferences"],
    outputs: ["Portfolio dashboard", "Alert notifications", "Price change display"]
  },
  portfolio: {
    title: "P3 · Portfolio & Trading",
    sub: "View and manage stocks and crypto holdings. Execute trades, set price targets, and monitor real-time data.",
    features: ["Real-time stock & crypto prices", "Buy and Sell order placement", "Holdings overview (shares owned)", "Take profit target setting", "Stop-loss order setting", "Watchlist & alerts per asset", "Portfolio performance chart"],
    linkedTo: ["dashboard", "insights"],
    inputs: ["Live price feeds", "User trade input", "Order parameters"],
    outputs: ["Updated portfolio", "Trade confirmations", "Price alert triggers"]
  },
  insights: {
    title: "P4 · Insights & Analytics",
    sub: "AI-powered analytics, risk profiling, and market sentiment. Helps investors make more informed decisions.",
    features: ["Risk profile assessment & score", "Asset allocation breakdown", "AI-generated investment insights", "Spending → Investing suggestions", "Market sentiment indicators", "Profit/Loss trend analytics"],
    linkedTo: ["dashboard", "portfolio"],
    inputs: ["User portfolio data", "Risk questionnaire answers", "Spending data", "Market sentiment feeds"],
    outputs: ["Risk score", "Allocation chart", "AI insight cards", "Sentiment display"]
  },
  tools: {
    title: "P5 · User Tools & Personalisation",
    sub: "Customise the platform experience. Manage alerts, notifications, recurring investments, and tax tools.",
    features: ["Custom dashboard configuration", "Notification & price alert management", "Tax reporting helper", "Recurring investment planner", "Goal-based investing setup", "Spending → investment suggestions"],
    linkedTo: ["dashboard", "security"],
    inputs: ["User preferences", "Investment goals", "Alert thresholds"],
    outputs: ["Custom dashboard layout", "Alert configuration", "Recurring investment schedule"]
  },
  learning: {
    title: "P6 · Learning & Guidance",
    sub: "Educational resources for all skill levels. Includes simulated trading for safe practice without real money.",
    features: ["Beginner-friendly tutorials (stocks, crypto, ETFs, risk)", "Daily market summaries", "Simulated trading mode (virtual funds)", "Goal-based investing guides (long-term, short-term, passive)", "Glossary of financial terms"],
    linkedTo: ["dashboard", "portfolio"],
    inputs: ["User skill level", "Simulation trade inputs", "Market data for simulation"],
    outputs: ["Tutorial content", "Simulation results", "Glossary lookups", "Daily market digest"]
  },
  security: {
    title: "P7 · Security & Account",
    sub: "Manage account credentials, biometric settings, and security preferences. Control notifications and sign-out.",
    features: ["Biometric login management", "Two-Factor Authentication (2FA)", "Email address management", "Password change", "Alert enable/disable toggle", "Session sign-out", "Encrypted data storage"],
    linkedTo: ["dashboard", "tools"],
    inputs: ["Security setting changes", "Biometric re-enrollment", "New credentials"],
    outputs: ["Updated security config", "Confirmation messages", "Session termination"]
  }
};

// ══════════════════════════════════════════════════════════════
// DOM REFERENCES
// ══════════════════════════════════════════════════════════════
const overlay    = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalContent = document.getElementById('modal-content');

// ══════════════════════════════════════════════════════════════
// MODAL OPEN / CLOSE
// ══════════════════════════════════════════════════════════════

/**
 * Build and display the modal for a given page key.
 * @param {string} pageKey - key from PAGE_DATA
 */
function openModal(pageKey) {
  const data = PAGE_DATA[pageKey];
  if (!data) return;

  const featuresHTML = data.features
    .map(f => `<span class="modal-tag">${f}</span>`)
    .join('');

  const linksHTML = data.linkedTo
    .map(key => {
      const linked = PAGE_DATA[key];
      const label = linked ? linked.title.split('·')[1].trim() : key;
      return `<button class="modal-link-btn" onclick="openModal('${key}')">→ ${label}</button>`;
    })
    .join('');

  const inputsHTML = data.inputs
    .map(i => `<div class="req-item"><span class="req-check">⬇</span>${i}</div>`)
    .join('');

  const outputsHTML = data.outputs
    .map(o => `<div class="req-item"><span class="req-check">⬆</span>${o}</div>`)
    .join('');

  modalContent.innerHTML = `
    <h2>${data.title}</h2>
    <p class="modal-sub">${data.sub}</p>

    <div class="modal-section">
      <h4>Features on this page</h4>
      <div class="modal-tags">${featuresHTML}</div>
    </div>

    <div class="modal-section">
      <h4>Data Inputs</h4>
      ${inputsHTML}
    </div>

    <div class="modal-section">
      <h4>Data Outputs</h4>
      ${outputsHTML}
    </div>

    <div class="modal-section">
      <h4>Navigates to</h4>
      <div class="modal-links">${linksHTML}</div>
    </div>
  `;

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/** Close the modal */
function closeModal() {
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// Close button
modalClose.addEventListener('click', closeModal);

// Click outside modal box
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
});

// Keyboard escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ══════════════════════════════════════════════════════════════
// WIREFRAME CARD CLICK HANDLERS
// ══════════════════════════════════════════════════════════════
const wfCards = document.querySelectorAll('.wf-card[data-target]');

wfCards.forEach(card => {
  const targetModal = card.getAttribute('data-target');
  // Map modal ID → page key
  const keyMap = {
    'modal-auth':      'auth',
    'modal-dashboard': 'dashboard',
    'modal-portfolio': 'portfolio',
    'modal-insights':  'insights',
    'modal-tools':     'tools',
    'modal-learning':  'learning',
    'modal-security':  'security'
  };

  card.addEventListener('click', () => {
    const key = keyMap[targetModal];
    if (key) openModal(key);
  });

  // Keyboard accessibility
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `View details for ${card.querySelector('.wf-page-name').textContent}`);

  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const key = keyMap[targetModal];
      if (key) openModal(key);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// ARCHITECTURE NODE CLICK HANDLERS
// ══════════════════════════════════════════════════════════════
const archNodes = document.querySelectorAll('.arch-node[data-page]');

archNodes.forEach(node => {
  const page = node.getAttribute('data-page');

  node.addEventListener('click', () => {
    openModal(page);
  });

  node.setAttribute('tabindex', '0');
  node.setAttribute('role', 'button');
  node.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal(page);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// ACTIVE NAV LINK (scroll spy)
// ══════════════════════════════════════════════════════════════
const navLinks = document.querySelectorAll('.header-nav a');
const sections = document.querySelectorAll('section[id]');

function updateActiveNav() {
  const scrollY = window.scrollY + 100;

  sections.forEach(section => {
    const top    = section.offsetTop;
    const height = section.offsetHeight;
    const id     = section.getAttribute('id');
    const link   = document.querySelector(`.header-nav a[href="#${id}"]`);

    if (link) {
      if (scrollY >= top && scrollY < top + height) {
        navLinks.forEach(l => l.style.color = '');
        link.style.color = 'var(--accent)';
      }
    }
  });
}

window.addEventListener('scroll', updateActiveNav, { passive: true });

// ══════════════════════════════════════════════════════════════
// SCROLL REVEAL — Intersection Observer for cards
// ══════════════════════════════════════════════════════════════
const revealTargets = document.querySelectorAll(
  '.wf-card, .data-card, .flow-journey, .arch-node'
);

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.1,
  rootMargin: '0px 0px -40px 0px'
});

// Init: set initial invisible state then observe
revealTargets.forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(18px)';
  el.style.transition = `opacity 0.45s ease ${(i % 7) * 0.07}s, transform 0.45s ease ${(i % 7) * 0.07}s`;
  revealObserver.observe(el);
});

// ══════════════════════════════════════════════════════════════
// TICKER LIVE UPDATE — randomly nudge values to simulate life
// ══════════════════════════════════════════════════════════════
const tickerPrices = {
  'AAPL': 2.4, 'TSLA': -1.1, 'BTC': 5.2, 'ETH': 3.7,
  'GOOGL': 0.8, 'AMZN': 1.3, 'MSFT': 2.1, 'NVDA': 4.5
};

function nudgeTickerValues() {
  const spans = document.querySelectorAll('.ticker-track span:not(.sep)');
  spans.forEach(span => {
    const text = span.textContent;
    const match = text.match(/^([A-Z]+)\s([+-]\d+\.\d+)%/);
    if (!match) return;

    const ticker = match[1];
    const base = tickerPrices[ticker] || 0;
    // Small random nudge ±0.2
    const nudge = (Math.random() - 0.5) * 0.4;
    const newVal = (base + nudge);
    const sign = newVal >= 0 ? '+' : '';
    span.textContent = `${ticker} ${sign}${newVal.toFixed(1)}%`;
    span.style.color = newVal >= 0 ? 'var(--green)' : 'var(--red)';
    tickerPrices[ticker] = newVal;
  });
}

// Update every 3 seconds
setInterval(nudgeTickerValues, 3000);
nudgeTickerValues(); // run immediately

// ══════════════════════════════════════════════════════════════
// HERO title entrance animation
// ══════════════════════════════════════════════════════════════
(function heroEntrance() {
  const line1 = document.querySelector('.hero-title .line1');
  const line2 = document.querySelector('.hero-title .line2');
  const eyebrow = document.querySelector('.hero-eyebrow');
  const sub = document.querySelector('.hero-sub');
  const pills = document.querySelector('.hero-pills');

  const elements = [eyebrow, line1, line2, sub, pills];

  elements.forEach((el, i) => {
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(14px)';
    el.style.transition = `opacity 0.55s ease ${i * 0.1 + 0.1}s, transform 0.55s ease ${i * 0.1 + 0.1}s`;

    // Trigger after paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  });
})();

// ══════════════════════════════════════════════════════════════
// SMOOTH SCROLL for anchor links
// ══════════════════════════════════════════════════════════════
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ══════════════════════════════════════════════════════════════
// FEATURE HOVER TOOLTIPS on feat tags
// ══════════════════════════════════════════════════════════════
document.querySelectorAll('.feat').forEach(tag => {
  tag.title = `Feature: ${tag.textContent}`;
});

// ══════════════════════════════════════════════════════════════
// CONSOLE GREETING
// ══════════════════════════════════════════════════════════════
console.log(
  '%c◈ YourStocks Wireframe %c\nHTML · CSS · JavaScript\nAll pages are interactive — click any card or architecture node.\n',
  'color: #00e5a0; font-size: 1.2rem; font-weight: bold; font-family: monospace;',
  'color: #8b929c; font-family: monospace; font-size: 0.85rem;'
);
