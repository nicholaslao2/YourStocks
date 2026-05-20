// Simple in-memory "storage" plus localStorage for demo persistence
const STORAGE_KEY = "yourstocks-demo-data";

let state = {
  user: null,
  portfolio: [],
  simCash: 100000,
  simHistory: [],
  riskProfile: null
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state = { ...state, ...parsed };
  } catch {
    // ignore parse errors
  }
}

function saveState() {
  const toSave = {
    user: state.user,
    portfolio: state.portfolio,
    simCash: state.simCash,
    simHistory: state.simHistory,
    riskProfile: state.riskProfile
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

// Utility: format currency
function fmt(n) {
  return "$" + n.toFixed(2);
}

// Authentication (very simple, demo only)
const authSection = document.getElementById("auth-section");
const appMain = document.getElementById("app");
const authForm = document.getElementById("auth-form");
const authMsg = document.getElementById("auth-message");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");

let authMode = "login"; // or "signup"

signupBtn.addEventListener("click", () => {
  authMode = "signup";
  authMsg.textContent = "Creating a new demo account (stored locally only).";
});

loginBtn.addEventListener("click", () => {
  authMode = "login";
});

authForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) return;

  // For demo: any username/password logs in and is stored locally
  state.user = { username };
  saveState();
  authSection.classList.add("hidden");
  appMain.classList.remove("hidden");
  renderAll();
});

// Portfolio & prices
const portfolioBody = document.getElementById("portfolio-body");
const totalValueEl = document.getElementById("total-value");
const alertsLog = document.getElementById("alerts-log");

document.getElementById("add-stock-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const ticker = document.getElementById("ticker-input").value.trim().toUpperCase();
  const qty = parseInt(document.getElementById("quantity-input").value, 10);

  if (!ticker || qty <= 0) return;

  const existing = state.portfolio.find((p) => p.ticker === ticker);
  if (existing) {
    existing.quantity += qty;
  } else {
    state.portfolio.push({
      ticker,
      quantity: qty,
      price: randomPrice(),
      alertPrice: ""
    });
  }
  saveState();
  renderPortfolio();
  renderTotals();
  e.target.reset();
});

function randomPrice() {
  return 20 + Math.random() * 180; // simple range
}

function updatePrices() {
  state.portfolio.forEach((item) => {
    // Simulate small random movement
    const change = (Math.random() - 0.5) * 2;
    item.price = Math.max(1, item.price + change);
    checkAlert(item);
  });
  renderPortfolio();
  renderTotals();
  saveState();
}

function checkAlert(item) {
  if (!item.alertPrice) return;
  const alertPrice = parseFloat(item.alertPrice);
  if (isNaN(alertPrice)) return;

  if (item.price >= alertPrice && !item._alerted) {
    item._alerted = true;
    const entry = document.createElement("div");
    entry.className = "alerts-log-entry";
    entry.textContent = `Alert: ${item.ticker} has reached ${fmt(item.price)} (alert price ${fmt(alertPrice)}).`;
    alertsLog.prepend(entry);
  }
}

function renderPortfolio() {
  portfolioBody.innerHTML = "";
  state.portfolio.forEach((item, idx) => {
    const tr = document.createElement("tr");

    const value = item.price * item.quantity;

    tr.innerHTML = `
      <td>${item.ticker}</td>
      <td>${item.quantity}</td>
      <td>${fmt(item.price)}</td>
      <td>${fmt(value)}</td>
      <td>
        <input type="number" step="0.01" value="${item.alertPrice || ""}" data-idx="${idx}" class="alert-input" />
      </td>
      <td>
        <button data-idx="${idx}" class="set-alert-btn">Save</button>
      </td>
      <td>
        <button data-idx="${idx}" class="remove-stock-btn">X</button>
      </td>
    `;
    portfolioBody.appendChild(tr);
  });

  // Wire up alert inputs and remove buttons
  portfolioBody.querySelectorAll(".alert-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const idx = parseInt(e.target.getAttribute("data-idx"), 10);
      state.portfolio[idx].alertPrice = e.target.value;
      state.portfolio[idx]._alerted = false;
      saveState();
    });
  });

  portfolioBody.querySelectorAll(".set-alert-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.target.getAttribute("data-idx"), 10);
      const rowInput = portfolioBody.querySelector(`.alert-input[data-idx="${idx}"]`);
      state.portfolio[idx].alertPrice = rowInput.value;
      state.portfolio[idx]._alerted = false;
      saveState();
    });
  });

  portfolioBody.querySelectorAll(".remove-stock-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.target.getAttribute("data-idx"), 10);
      state.portfolio.splice(idx, 1);
      saveState();
      renderPortfolio();
      renderTotals();
    });
  });
}

function renderTotals() {
  const total = state.portfolio.reduce((sum, item) => sum + item.price * item.quantity, 0);
  totalValueEl.textContent = fmt(total);
  document.getElementById("sim-cash").textContent = fmt(state.simCash);
}

// Risk profile
const riskForm = document.getElementById("risk-form");
const riskResult = document.getElementById("risk-result");
const riskProfileDisplay = document.getElementById("risk-profile-display");

riskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const q1 = document.getElementById("q1").value;
  const q2 = document.getElementById("q2").value;
  const q3 = document.getElementById("q3").value;

  if (!q1 || !q2 || !q3) return;

  const scores = { low: 0, medium: 0, high: 0 };
  [q1, q2, q3].forEach((ans) => {
    scores[ans]++;
  });

  let profile = "Conservative";
  if (scores.high >= 2) profile = "Aggressive";
  else if (scores.medium >= 2 || scores.high === 1) profile = "Balanced";

  state.riskProfile = profile;
  saveState();

  riskResult.textContent = `Your risk profile is: ${profile}.`;
  riskProfileDisplay.textContent = profile;
});

// Simulation trading
const simForm = document.getElementById("sim-trade-form");
const simHistoryBody = document.getElementById("sim-history-body");

simForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const ticker = document.getElementById("sim-ticker").value.trim().toUpperCase();
  const qty = parseInt(document.getElementById("sim-quantity").value, 10);
  const side = document.getElementById("sim-side").value;

  if (!ticker || qty <= 0) return;

  const price = randomPrice();
  const value = price * qty;

  if (side === "buy" && value > state.simCash) {
    alert("Not enough simulated cash for this trade.");
    return;
  }

  if (side === "buy") {
    state.simCash -= value;
  } else {
    state.simCash += value;
  }

  const trade = {
    time: new Date().toLocaleTimeString(),
    ticker,
    side,
    quantity: qty,
    price,
    value
  };

  state.simHistory.unshift(trade);
  saveState();
  renderSimHistory();
  renderTotals();
  e.target.reset();
});

function renderSimHistory() {
  simHistoryBody.innerHTML = "";
  state.simHistory.forEach((t) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.time}</td>
      <td>${t.ticker}</td>
      <td>${t.side.toUpperCase()}</td>
      <td>${t.quantity}</td>
      <td>${fmt(t.price)}</td>
      <td>${fmt(t.value)}</td>
    `;
    simHistoryBody.appendChild(tr);
  });
}

// Initialisation
function renderAll() {
  renderPortfolio();
  renderTotals();
  renderSimHistory();
  if (state.riskProfile) {
    riskProfileDisplay.textContent = state.riskProfile;
    riskResult.textContent = `Your risk profile is: ${state.riskProfile}.`;
  }
}

// Load state and show app if user exists
loadState();
if (state.user) {
  authSection.classList.add("hidden");
  appMain.classList.remove("hidden");
  renderAll();
}

// Simulated real-time price updates
setInterval(updatePrices, 3000);
