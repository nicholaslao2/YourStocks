// --- STATE ---
let state = {
  user: null,
  portfolio: [],
  simCash: 100000,
  simHistory: [],
  riskProfile: null
};

function save() {
  localStorage.setItem("YS", JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem("YS");
  if (raw) state = { ...state, ...JSON.parse(raw) };
}
load();

// --- AUTH ---
const authScreen = document.getElementById("auth-screen");
const screens = document.querySelectorAll(".screen");

function showScreen(id) {
  screens.forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

document.getElementById("login-btn").onclick = () => {
  const u = document.getElementById("auth-username").value;
  const p = document.getElementById("auth-password").value;

  if (!u || !p) return;

  state.user = { username: u };
  save();
  authScreen.classList.remove("active");
  showScreen("dashboard");
  renderAll();
};

document.getElementById("signup-btn").onclick = () => {
  const u = document.getElementById("auth-username").value;
  const p = document.getElementById("auth-password").value;

  if (!u || !p) return;

  state.user = { username: u };
  save();
  authScreen.classList.remove("active");
  showScreen("dashboard");
  renderAll();
};

// --- NAV ---
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.onclick = () => {
    const target = btn.dataset.target;
    if (target) showScreen(target);
    if (btn.classList.contains("logout-btn")) {
      state.user = null;
      save();
      location.reload();
    }
  };
});

// --- PORTFOLIO ---
function randomPrice() {
  return 20 + Math.random() * 200;
}

function updatePrices() {
  state.portfolio.forEach(p => {
    p.price += (Math.random() - 0.5) * 2;
    if (p.alert && p.price >= p.alert && !p.hit) {
      p.hit = true;
      const log = document.getElementById("alerts-log");
      log.innerHTML = `<div>🔔 ${p.ticker} hit ${p.alert}</div>` + log.innerHTML;
    }
  });
  renderPortfolio();
  renderTotals();
  save();
}

setInterval(updatePrices, 3000);

document.getElementById("add-stock-form").onsubmit = e => {
  e.preventDefault();
  const t = document.getElementById("ticker-input").value.toUpperCase();
  const q = parseInt(document.getElementById("quantity-input").value);

  if (!t || q <= 0) return;

  const existing = state.portfolio.find(x => x.ticker === t);
  if (existing) existing.quantity += q;
  else state.portfolio.push({ ticker: t, quantity: q, price: randomPrice() });

  save();
  renderPortfolio();
  renderTotals();
};

function renderPortfolio() {
  const body = document.getElementById("portfolio-body");
  body.innerHTML = "";

  state.portfolio.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.ticker}</td>
      <td>${p.quantity}</td>
      <td>$${p.price.toFixed(2)}</td>
      <td>$${(p.price * p.quantity).toFixed(2)}</td>
      <td><input data-i="${i}" class="alert-input" value="${p.alert || ""}" /></td>
      <td><button data-i="${i}" class="remove-btn">X</button></td>
    `;
    body.appendChild(tr);
  });

  document.querySelectorAll(".alert-input").forEach(inp => {
    inp.onchange = () => {
      const i = inp.dataset.i;
      state.portfolio[i].alert = parseFloat(inp.value);
      state.portfolio[i].hit = false;
      save();
    };
  });

  document.querySelectorAll(".remove-btn").forEach(btn => {
    btn.onclick = () => {
      state.portfolio.splice(btn.dataset.i, 1);
      save();
      renderPortfolio();
      renderTotals();
    };
  });
}

function renderTotals() {
  const total = state.portfolio.reduce((s, p) => s + p.price * p.quantity, 0);
  document.getElementById("total-value").textContent = "$" + total.toFixed(2);
  document.getElementById("sim-cash").textContent = "$" + state.simCash.toFixed(2);
}

// --- RISK PROFILE ---
document.getElementById("risk-form").onsubmit = e => {
  e.preventDefault();
  const q1 = q1.value, q2 = q2.value, q3 = q3.value;

  const score = [q1, q2, q3].filter(x => x === "high").length;

  let profile = "Conservative";
  if (score === 1) profile = "Balanced";
  if (score >= 2) profile = "Aggressive";

  state.riskProfile = profile;
  save();

  document.getElementById("risk-result").textContent = "Your profile: " + profile;
  document.getElementById("risk-profile-display").textContent = profile;
};

// --- SIM TRADING ---
document.getElementById("sim-trade-form").onsubmit = e => {
  e.preventDefault();
  const t = simTicker.value.toUpperCase();
  const q = parseInt(simQuantity.value);
  const side = simSide.value;

  const price = randomPrice();
  const value = price * q;

  if (side === "buy" && value > state.simCash) return alert("Not enough cash");

  if (side === "buy") state.simCash -= value;
  else state.simCash += value;

  state.simHistory.unshift({
    time: new Date().toLocaleTimeString(),
    ticker: t,
    side,
    quantity: q,
    price,
    value
  });

  save();
  renderSimHistory();
  renderTotals();
};

function renderSimHistory() {
  const body = document.getElementById("sim-history-body");
  body.innerHTML = "";
  state.simHistory.forEach(t => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.time}</td>
      <td>${t.ticker}</td>
      <td>${t.side}</td>
      <td>${t.quantity}</td>
      <td>$${t.price.toFixed(2)}</td>
      <td>$${t.value.toFixed(2)}</td>
    `;
    body.appendChild(tr);
  });
}

// --- INIT ---
function renderAll() {
  renderPortfolio();
  renderTotals();
  renderSimHistory();
  if (state.riskProfile)
    document.getElementById("risk-profile-display").textContent = state.riskProfile;
}

if (state.user) {
  authScreen.classList.remove("active");
  showScreen("dashboard");
  renderAll();
}
