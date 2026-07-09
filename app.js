/* ==========================================================================
   YourStocks — Platform App
   All state lives in localStorage under the logged-in user's key. Prices
   tick on a client-side interval via MarketEngine (see data.js). Nothing
   here talks to a server — this is a static, GitHub-Pages-friendly demo.
   ========================================================================== */

/* ---------------------------- Auth guard ---------------------------- */
const SESSION_EMAIL = localStorage.getItem("ys_session");
if (!SESSION_EMAIL) {
  window.location.href = "index.html";
}
const STATE_KEY = `ys_state_${SESSION_EMAIL}`;

function loadState() {
  return JSON.parse(localStorage.getItem(STATE_KEY));
}
function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(STATE));
}

let STATE = loadState();
if (!STATE) {
  // Session pointed at a user whose state got wiped (e.g. storage cleared
  // manually) — reinitialise a fresh paper account rather than crashing.
  STATE = {
    cash: 100000,
    holdings: {},
    trades: [],
    watchlist: ["BHP", "CBA", "AAPL", "NVDA", "XRO", "TSLA"],
    riskProfile: null,
    portfolioHistory: [{ ts: Date.now(), value: 100000 }],
  };
  localStorage.setItem(STATE_KEY, JSON.stringify(STATE));
}
const USERS = JSON.parse(localStorage.getItem("ys_users") || "{}");
const ME = USERS[SESSION_EMAIL] || { name: "Trader" };

/* ---------------------------- Chart palette ---------------------------- */
const PALETTE = ["#00E58A", "#FFB020", "#4EA1FF", "#FF4D5E", "#B98CFF", "#3DD9E8", "#8AA096"];
Chart.defaults.color = "#8AA096";
Chart.defaults.font.family = "JetBrains Mono";

/* ---------------------------- Quote helper ---------------------------- */
function getQuote(ticker) {
  const stock = findStock(ticker);
  const live = MarketEngine.get(ticker);
  const changeAbs = live.price - live.prevClose;
  const changePct = (changeAbs / live.prevClose) * 100;
  return { ...stock, ...live, changeAbs, changePct };
}

/* in-memory intraday price history for drawer sparkline (resets on reload) */
const priceHistoryBuf = {};
STOCK_UNIVERSE.forEach((s) => (priceHistoryBuf[s.ticker] = [MarketEngine.get(s.ticker).price]));
function pushPriceHistory() {
  STOCK_UNIVERSE.forEach((s) => {
    const buf = priceHistoryBuf[s.ticker];
    buf.push(MarketEngine.get(s.ticker).price);
    if (buf.length > 50) buf.shift();
  });
}

/* ---------------------------- Portfolio math ---------------------------- */
function holdingValueAUD(ticker, holding) {
  const price = MarketEngine.get(ticker).price;
  return toAUD(price, holding.market) * holding.qty;
}
function investedValueAUD() {
  return Object.entries(STATE.holdings).reduce((sum, [t, h]) => sum + holdingValueAUD(t, h), 0);
}
function portfolioValueAUD() {
  return STATE.cash + investedValueAUD();
}
function unrealizedPnlAUD() {
  return Object.entries(STATE.holdings).reduce((sum, [t, h]) => {
    const price = MarketEngine.get(t).price;
    const costAUD = toAUD(h.avgCost, h.market) * h.qty;
    const valAUD = toAUD(price, h.market) * h.qty;
    return sum + (valAUD - costAUD);
  }, 0);
}
function realizedPnlAUD() {
  return STATE.trades.filter((t) => t.side === "SELL").reduce((sum, t) => sum + (t.realizedPnl || 0), 0);
}

/* ---------------------------- Trading engine ---------------------------- */
function executeTrade(ticker, side, qty) {
  const stock = findStock(ticker);
  const quote = getQuote(ticker);
  const price = quote.price;

  if (side === "BUY") {
    const costAUD = toAUD(price, stock.market) * qty;
    if (costAUD > STATE.cash + 1e-6) {
      return { ok: false, error: "Not enough cash for that order." };
    }
    const existing = STATE.holdings[ticker];
    if (existing) {
      const newQty = existing.qty + qty;
      existing.avgCost = (existing.avgCost * existing.qty + price * qty) / newQty;
      existing.qty = newQty;
    } else {
      STATE.holdings[ticker] = { qty, avgCost: price, market: stock.market };
    }
    STATE.cash -= costAUD;
    STATE.trades.unshift({
      id: crypto.randomUUID(), ticker, market: stock.market, side, qty, price,
      totalAUD: costAUD, timestamp: Date.now(),
    });
  } else {
    const existing = STATE.holdings[ticker];
    if (!existing || existing.qty < qty) {
      return { ok: false, error: `You only hold ${existing ? existing.qty : 0} share(s) of ${ticker}.` };
    }
    const proceedsAUD = toAUD(price, stock.market) * qty;
    const realizedPnl = toAUD(price - existing.avgCost, stock.market) * qty;
    existing.qty -= qty;
    if (existing.qty === 0) delete STATE.holdings[ticker];
    STATE.cash += proceedsAUD;
    STATE.trades.unshift({
      id: crypto.randomUUID(), ticker, market: stock.market, side, qty, price,
      totalAUD: proceedsAUD, realizedPnl, timestamp: Date.now(),
    });
  }

  STATE.portfolioHistory.push({ ts: Date.now(), value: portfolioValueAUD() });
  if (STATE.portfolioHistory.length > 400) STATE.portfolioHistory.shift();
  saveState();
  return { ok: true };
}

/* ---------------------------- View switching ---------------------------- */
let currentView = "overview";
function switchView(view) {
  currentView = view;
  document.querySelectorAll(".navlink").forEach((el) => el.classList.toggle("is-active", el.dataset.view === view));
  document.querySelectorAll("[data-view-panel]").forEach((el) => el.classList.toggle("is-hidden", el.dataset.viewPanel !== view));
  renderActiveView();
}
document.querySelectorAll(".navlink").forEach((el) => el.addEventListener("click", () => switchView(el.dataset.view)));
document.querySelectorAll("[data-goto]").forEach((el) => el.addEventListener("click", () => switchView(el.dataset.goto)));

function renderActiveView() {
  if (currentView === "overview") renderOverview();
  else if (currentView === "markets") renderMarkets();
  else if (currentView === "portfolio") renderPortfolio();
  else if (currentView === "risk") renderRiskSnapshot();
  else if (currentView === "history") renderHistory();
}

/* ---------------------------- Shared header widgets ---------------------------- */
function renderTopWidgets() {
  document.getElementById("cashValue").textContent = fmtMoney(STATE.cash);
  document.getElementById("userName").textContent = ME.name;
  document.getElementById("userAvatar").textContent = ME.name.charAt(0).toUpperCase();

  const statuses = allMarketStatuses();
  renderMarketPill("pillASX", statuses.ASX);
  renderMarketPill("pillUS", statuses.US);
}
function renderMarketPill(elId, status) {
  const el = document.getElementById(elId);
  el.innerHTML = `
    <div class="market-pill__left">
      <span class="market-pill__dot ${status.isOpen ? "open" : "closed"}"></span>
      <span class="market-pill__name">${status.market}</span>
    </div>
    <span class="market-pill__count">${status.countdown}</span>`;
}

/* ---------------------------- Ticker tape ---------------------------- */
const TAPE_TICKERS = ["BHP", "CBA", "CSL", "XRO", "FMG", "WES", "AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "GOOGL", "META", "COH", "STO"];
function buildTickerTape() {
  const track = document.getElementById("tickerTrack");
  const row = TAPE_TICKERS.map((t) => tapeItemHTML(t)).join("");
  track.innerHTML = row + row; // duplicate for seamless scroll
}
function tapeItemHTML(ticker) {
  const q = getQuote(ticker);
  const up = q.changePct >= 0;
  return `<div class="tape-item" data-tape="${ticker}">
    <span class="tape-item__ticker">${ticker}</span>
    <span class="tape-item__price" data-tape-price>${fmtMoney(q.price, q.market === "US" ? "USD" : "AUD")}</span>
    <span class="tape-item__chg ${up ? "up" : "down"}" data-tape-chg>${fmtPct(q.changePct)}</span>
  </div>`;
}
function updateTickerTape() {
  document.querySelectorAll("[data-tape]").forEach((el) => {
    const q = getQuote(el.dataset.tape);
    const up = q.changePct >= 0;
    el.querySelector("[data-tape-price]").textContent = fmtMoney(q.price, q.market === "US" ? "USD" : "AUD");
    const chgEl = el.querySelector("[data-tape-chg]");
    chgEl.textContent = fmtPct(q.changePct);
    chgEl.className = `tape-item__chg ${up ? "up" : "down"}`;
  });
}

/* ---------------------------- Overview ---------------------------- */
let sparkChart, allocChart, portfolioChart, drawerChart, moversFilter = "ALL";

function renderOverview() {
  const pv = portfolioValueAUD();
  const startVal = STATE.portfolioHistory[0]?.value || pv;
  const deltaPct = ((pv - startVal) / startVal) * 100;

  document.getElementById("portfolioValue").textContent = fmtMoney(pv);
  const deltaEl = document.getElementById("portfolioDelta");
  deltaEl.textContent = `${fmtPct(deltaPct)} all-time`;
  deltaEl.className = `hero-card__delta ${deltaPct >= 0 ? "up" : "down"}`;

  const unreal = unrealizedPnlAUD();
  const real = realizedPnlAUD();
  setPnlCard("totalPnl", "totalPnlSub", unreal + real, "Realised + unrealised");
  setPnlCard("unrealPnl", "unrealPnlSub", unreal, "Open positions");
  setPnlCard("realPnl", "realPnlSub", real, "Closed trades");

  renderSparkline();
  renderHoldingsTable("overviewHoldings", Object.keys(STATE.holdings).slice(0, 6), true);
  renderAllocation();
  renderMovers();
  renderWatchlistTable();
}
function setPnlCard(valueId, subId, value, subLabel) {
  const el = document.getElementById(valueId);
  el.textContent = fmtMoney(value);
  el.className = `stat-card__value ${value >= 0 ? "up" : "down"}`;
  document.getElementById(subId).textContent = subLabel;
}

function renderSparkline() {
  const ctx = document.getElementById("portfolioSpark");
  const pts = STATE.portfolioHistory.slice(-40);
  const up = pts[pts.length - 1].value >= pts[0].value;
  const color = up ? "#00E58A" : "#FF4D5E";
  if (sparkChart) sparkChart.destroy();
  sparkChart = new Chart(ctx, {
    type: "line",
    data: { labels: pts.map((_, i) => i), datasets: [{ data: pts.map((p) => p.value), borderColor: color, borderWidth: 2, pointRadius: 0, tension: 0.35, fill: true, backgroundColor: up ? "rgba(0,229,138,0.08)" : "rgba(255,77,94,0.08)" }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } },
  });
}

function renderAllocation() {
  const ctx = document.getElementById("allocationChart");
  const entries = Object.entries(STATE.holdings);
  const labels = ["Cash", ...entries.map(([t]) => t)];
  const values = [STATE.cash, ...entries.map(([t, h]) => holdingValueAUD(t, h))];
  const colors = [PALETTE[6], ...entries.map((_, i) => PALETTE[i % (PALETTE.length - 1)])];

  if (allocChart) allocChart.destroy();
  allocChart = new Chart(ctx, {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderColor: "#121915", borderWidth: 3 }] },
    options: { responsive: true, maintainAspectRatio: true, cutout: "68%", plugins: { legend: { display: false } } },
  });

  const total = values.reduce((a, b) => a + b, 0) || 1;
  document.getElementById("allocationLegend").innerHTML = labels.map((l, i) =>
    `<div class="legend__item"><span class="legend__swatch" style="background:${colors[i]}"></span>${l} · ${((values[i] / total) * 100).toFixed(0)}%</div>`
  ).join("");
}

function renderMovers() {
  document.querySelectorAll("#moversSeg button").forEach((b) => b.classList.toggle("is-active", b.dataset.market === moversFilter));
  let list = MarketEngine.all().filter((s) => moversFilter === "ALL" || s.market === moversFilter);
  list = list.map((s) => getQuote(s.ticker)).sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 6);
  renderQuoteTable("moversTable", list);
}
document.getElementById("moversSeg").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  moversFilter = btn.dataset.market;
  renderMovers();
});

function renderWatchlistTable() {
  const list = STATE.watchlist.map((t) => getQuote(t));
  renderQuoteTable("watchlistTable", list, true);
}

/* ---------------------------- Shared quote table renderer ---------------------------- */
function renderQuoteTable(elId, quotes, showStar = false) {
  const el = document.getElementById(elId);
  if (!quotes.length) {
    el.innerHTML = `<table><tbody><tr class="empty-row"><td>Nothing to show yet.</td></tr></tbody></table>`;
    return;
  }
  el.innerHTML = `<table>
    <thead><tr><th>Stock</th><th>Market</th><th>Price</th><th>Change</th>${showStar ? "<th></th>" : ""}<th></th></tr></thead>
    <tbody>${quotes.map((q) => quoteRowHTML(q, showStar)).join("")}</tbody>
  </table>`;
  el.querySelectorAll("tr[data-ticker]").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest("[data-star]") || e.target.closest("[data-buy]")) return;
      openDrawer(row.dataset.ticker, "BUY");
    });
  });
  el.querySelectorAll("[data-star]").forEach((btn) => btn.addEventListener("click", (e) => { e.stopPropagation(); toggleWatchlist(btn.dataset.star); }));
  el.querySelectorAll("[data-buy]").forEach((btn) => btn.addEventListener("click", (e) => { e.stopPropagation(); openDrawer(btn.dataset.buy, "BUY"); }));
}
function quoteRowHTML(q, showStar) {
  const up = q.changePct >= 0;
  const starred = STATE.watchlist.includes(q.ticker);
  return `<tr class="is-clickable" data-ticker="${q.ticker}">
    <td><div class="cell-name"><span class="cell-name__ticker">${q.ticker}</span><span class="cell-name__full">${q.name}</span></div></td>
    <td><span class="market-tag ${q.market}">${q.market}</span></td>
    <td class="mono">${fmtMoney(q.price, q.market === "US" ? "USD" : "AUD")}</td>
    <td class="mono ${up ? "up-text" : "down-text"}">${fmtPct(q.changePct)}</td>
    ${showStar ? `<td><button class="star-btn ${starred ? "is-active" : ""}" data-star="${q.ticker}">★</button></td>` : ""}
    <td><button class="table-buy-btn" data-buy="${q.ticker}">Trade</button></td>
  </tr>`;
}
function toggleWatchlist(ticker) {
  const idx = STATE.watchlist.indexOf(ticker);
  if (idx >= 0) STATE.watchlist.splice(idx, 1);
  else STATE.watchlist.push(ticker);
  saveState();
  renderActiveView();
}

/* ---------------------------- Holdings table (overview + portfolio) ---------------------------- */
function renderHoldingsTable(elId, tickers, compact = false) {
  const el = document.getElementById(elId);
  if (!tickers.length) {
    el.innerHTML = `<table><tbody><tr class="empty-row"><td>No positions yet — head to Markets to place your first trade.</td></tr></tbody></table>`;
    return;
  }
  const rows = tickers.map((t) => {
    const h = STATE.holdings[t];
    const q = getQuote(t);
    const priceAUD = toAUD(q.price, h.market);
    const costAUD = toAUD(h.avgCost, h.market);
    const marketValue = priceAUD * h.qty;
    const pnl = (priceAUD - costAUD) * h.qty;
    const pnlPct = ((priceAUD - costAUD) / costAUD) * 100;
    return `<tr class="is-clickable" data-ticker="${t}">
      <td><div class="cell-name"><span class="cell-name__ticker">${t}</span><span class="cell-name__full">${q.name}</span></div></td>
      <td><span class="market-tag ${h.market}">${h.market}</span></td>
      <td class="mono">${h.qty}</td>
      <td class="mono">${fmtMoney(costAUD)}</td>
      <td class="mono">${fmtMoney(priceAUD)}</td>
      <td class="mono">${fmtMoney(marketValue)}</td>
      <td class="mono ${pnl >= 0 ? "up-text" : "down-text"}">${fmtMoney(pnl)} (${fmtPct(pnlPct)})</td>
      ${compact ? "" : `<td><button class="table-buy-btn" data-buy="${t}">Trade</button></td>`}
    </tr>`;
  }).join("");
  el.innerHTML = `<table>
    <thead><tr><th>Stock</th><th>Market</th><th>Qty</th><th>Avg cost</th><th>Price</th><th>Value</th><th>Unrealised PnL</th>${compact ? "" : "<th></th>"}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
  el.querySelectorAll("tr[data-ticker]").forEach((row) => row.addEventListener("click", (e) => {
    if (e.target.closest("[data-buy]")) return;
    openDrawer(row.dataset.ticker, "SELL");
  }));
  el.querySelectorAll("[data-buy]").forEach((btn) => btn.addEventListener("click", (e) => { e.stopPropagation(); openDrawer(btn.dataset.buy, "SELL"); }));
}

/* ---------------------------- Markets view ---------------------------- */
let marketsFilter = "ALL", sectorFilterVal = "ALL";
function initSectorFilter() {
  const sectors = [...new Set(STOCK_UNIVERSE.map((s) => s.sector))].sort();
  const sel = document.getElementById("sectorFilter");
  sectors.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s; opt.textContent = s;
    sel.appendChild(opt);
  });
  sel.addEventListener("change", () => { sectorFilterVal = sel.value; renderMarkets(); });
}
document.getElementById("marketSeg").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  marketsFilter = btn.dataset.market;
  document.querySelectorAll("#marketSeg button").forEach((b) => b.classList.toggle("is-active", b === btn));
  renderMarkets();
});
function renderMarkets() {
  let list = STOCK_UNIVERSE.filter((s) => (marketsFilter === "ALL" || s.market === marketsFilter) && (sectorFilterVal === "ALL" || s.sector === sectorFilterVal));
  const quotes = list.map((s) => getQuote(s.ticker));
  renderQuoteTable("marketsTable", quotes, true);
}

/* ---------------------------- Portfolio view ---------------------------- */
function renderPortfolio() {
  const pv = portfolioValueAUD();
  document.getElementById("pfValue").textContent = fmtMoney(pv);
  document.getElementById("pfCash").textContent = fmtMoney(STATE.cash);
  const total = unrealizedPnlAUD() + realizedPnlAUD();
  const totalEl = document.getElementById("pfTotalPnl");
  totalEl.textContent = fmtMoney(total);
  totalEl.className = `stat-card__value ${total >= 0 ? "up" : "down"}`;
  document.getElementById("pfPositions").textContent = Object.keys(STATE.holdings).length;

  renderPortfolioChart();
  renderHoldingsTable("portfolioHoldings", Object.keys(STATE.holdings), false);
}
function renderPortfolioChart() {
  const ctx = document.getElementById("portfolioChart");
  const pts = STATE.portfolioHistory;
  const up = pts[pts.length - 1].value >= pts[0].value;
  const color = up ? "#00E58A" : "#FF4D5E";
  if (portfolioChart) portfolioChart.destroy();
  portfolioChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: pts.map((p) => new Date(p.ts).toLocaleDateString("en-AU", { day: "2-digit", month: "short" })),
      datasets: [{ data: pts.map((p) => p.value), borderColor: color, backgroundColor: up ? "rgba(0,229,138,0.08)" : "rgba(255,77,94,0.08)", borderWidth: 2, pointRadius: 0, tension: 0.3, fill: true }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 6, color: "#5B6F65" } },
        y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#5B6F65", callback: (v) => "$" + v.toLocaleString() } },
      },
    },
  });
}

/* ---------------------------- History view ---------------------------- */
function renderHistory() {
  const el = document.getElementById("historyTable");
  if (!STATE.trades.length) {
    el.innerHTML = `<table><tbody><tr class="empty-row"><td>No trades yet. Once you buy or sell, they'll show up here.</td></tr></tbody></table>`;
    return;
  }
  el.innerHTML = `<table>
    <thead><tr><th>Date</th><th>Stock</th><th>Market</th><th>Side</th><th>Qty</th><th>Price</th><th>Total (AUD)</th><th>Realised PnL</th></tr></thead>
    <tbody>${STATE.trades.map((t) => `
      <tr>
        <td class="mono">${new Date(t.timestamp).toLocaleString("en-AU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
        <td class="cell-name__ticker mono">${t.ticker}</td>
        <td><span class="market-tag ${t.market}">${t.market}</span></td>
        <td class="mono ${t.side === "BUY" ? "up-text" : "down-text"}">${t.side}</td>
        <td class="mono">${t.qty}</td>
        <td class="mono">${fmtMoney(t.price, t.market === "US" ? "USD" : "AUD")}</td>
        <td class="mono">${fmtMoney(t.totalAUD)}</td>
        <td class="mono ${t.realizedPnl == null ? "" : t.realizedPnl >= 0 ? "up-text" : "down-text"}">${t.realizedPnl == null ? "—" : fmtMoney(t.realizedPnl)}</td>
      </tr>`).join("")}</tbody>
  </table>`;
}

/* ---------------------------- Risk profile: quiz ---------------------------- */
const RISK_QUESTIONS = [
  { q: "What's your investing time horizon?", opts: [
    { label: "Less than 1 year", score: 1 }, { label: "1–3 years", score: 2 },
    { label: "3–7 years", score: 3 }, { label: "7+ years", score: 4 } ] },
  { q: "Your portfolio drops 20% in a month. What do you do?", opts: [
    { label: "Sell everything to stop the bleeding", score: 1 }, { label: "Sell some to reduce exposure", score: 2 },
    { label: "Hold and wait it out", score: 3 }, { label: "Buy more while it's cheap", score: 4 } ] },
  { q: "How much investing experience do you have?", opts: [
    { label: "None — this is new to me", score: 1 }, { label: "A little — I've dabbled", score: 2 },
    { label: "Comfortable — I invest semi-regularly", score: 3 }, { label: "Extensive — I trade actively", score: 4 } ] },
  { q: "What's the goal for this money?", opts: [
    { label: "Protecting what I have", score: 1 }, { label: "Steady, reliable growth", score: 2 },
    { label: "Long-term growth, some ups and downs are fine", score: 3 }, { label: "Maximum growth — volatility doesn't bother me", score: 4 } ] },
  { q: "How stable is your income right now?", opts: [
    { label: "Uncertain / variable", score: 1 }, { label: "Fairly stable", score: 2 },
    { label: "Stable", score: 3 }, { label: "Very stable, with a savings buffer", score: 4 } ] },
  { q: "What share of your savings does this represent?", opts: [
    { label: "Most of it", score: 1 }, { label: "A large chunk", score: 2 },
    { label: "A moderate portion", score: 3 }, { label: "A small slice I can afford to lose", score: 4 } ] },
];
const RISK_CATEGORIES = [
  { max: 10, name: "Conservative", color: "var(--blue)", desc: "You prioritise protecting capital over chasing returns. Sharp swings aren't for you — and that's a perfectly sound way to invest.", alloc: { defensive: 70, growth: 30 } },
  { max: 15, name: "Balanced", color: "var(--bull)", desc: "You're comfortable with some volatility in exchange for steadier long-term growth, without going all-in on risk.", alloc: { defensive: 50, growth: 50 } },
  { max: 20, name: "Growth", color: "var(--gold)", desc: "You're willing to ride out volatility for stronger long-term returns and lean toward growth-oriented positions.", alloc: { defensive: 30, growth: 70 } },
  { max: 24, name: "Aggressive", color: "var(--bear)", desc: "You're chasing maximum growth and can stomach significant swings along the way.", alloc: { defensive: 10, growth: 90 } },
];
let quizAnswers = {};

function renderRiskQuiz() {
  const wrap = document.getElementById("riskQuizWrap");
  if (STATE.riskProfile) {
    const cat = RISK_CATEGORIES.find((c) => c.name === STATE.riskProfile.category);
    wrap.innerHTML = `
      <div class="risk-result">
        <div class="risk-result__badge" style="background:color-mix(in srgb, ${cat.color} 16%, transparent); color:${cat.color}">${cat.name} investor</div>
        <p class="risk-result__desc">${cat.desc}</p>
        <div class="risk-alloc">
          <div class="risk-alloc__item"><b>${cat.alloc.defensive}%</b><span>Defensive</span></div>
          <div class="risk-alloc__item"><b>${cat.alloc.growth}%</b><span>Growth</span></div>
        </div>
        <button class="btn btn--ghost" id="retakeQuizBtn" style="margin-top:16px;">Retake quiz</button>
      </div>
      <p class="risk-note">General information only — not personal financial advice. YourStocks is a paper-trading sandbox; for real decisions, speak with a licensed financial adviser.</p>`;
    document.getElementById("retakeQuizBtn").addEventListener("click", () => { STATE.riskProfile = null; saveState(); quizAnswers = {}; renderRiskQuiz(); });
    return;
  }

  wrap.innerHTML = RISK_QUESTIONS.map((item, qi) => `
    <div class="quiz-q">
      <p>${qi + 1}. ${item.q}</p>
      <div class="quiz-opts">
        ${item.opts.map((o, oi) => `<label class="quiz-opt" data-qi="${qi}" data-oi="${oi}">
          <input type="radio" name="q${qi}" value="${o.score}" />${o.label}
        </label>`).join("")}
      </div>
    </div>`).join("") + `<button class="btn btn--primary btn--block" id="seeResultsBtn">See my risk profile</button>
      <p class="risk-note">General information only — not personal financial advice.</p>`;

  wrap.querySelectorAll(".quiz-opt").forEach((label) => {
    label.addEventListener("click", () => {
      const qi = label.dataset.qi;
      quizAnswers[qi] = parseInt(label.querySelector("input").value, 10);
      wrap.querySelectorAll(`.quiz-opt[data-qi="${qi}"]`).forEach((l) => l.classList.remove("is-selected"));
      label.classList.add("is-selected");
    });
  });
  document.getElementById("seeResultsBtn").addEventListener("click", () => {
    if (Object.keys(quizAnswers).length < RISK_QUESTIONS.length) {
      showToast("Answer every question to see your profile.", "error");
      return;
    }
    const score = Object.values(quizAnswers).reduce((a, b) => a + b, 0);
    const cat = RISK_CATEGORIES.find((c) => score <= c.max);
    STATE.riskProfile = { score, category: cat.name, computedAt: Date.now() };
    saveState();
    renderRiskQuiz();
  });
}

/* ---------------------------- Risk profile: portfolio snapshot ---------------------------- */
function renderRiskSnapshot() {
  renderRiskQuiz();
  const el = document.getElementById("riskSnapshot");
  const entries = Object.entries(STATE.holdings);
  if (!entries.length) {
    el.innerHTML = `<div class="risk-note" style="margin-top:0;">You don't hold any positions yet, so there's nothing to analyse. Buy a few stocks in Markets and this snapshot will fill in automatically.</div>`;
    return;
  }
  const values = entries.map(([t, h]) => holdingValueAUD(t, h));
  const total = values.reduce((a, b) => a + b, 0);
  const weights = values.map((v) => v / total);
  const hhi = weights.reduce((sum, w) => sum + w * w, 0) * 10000;
  const concLabel = hhi > 2500 ? "High" : hhi > 1500 ? "Moderate" : "Low";
  const concPct = Math.min(100, (hhi / 5000) * 100);

  const weightedVol = entries.reduce((sum, [t, h], i) => sum + weights[i] * (SECTOR_VOLATILITY[findStock(t).sector] || 0.5), 0);
  const volLabel = weightedVol > 0.7 ? "High" : weightedVol > 0.45 ? "Medium" : "Low";
  const volPct = weightedVol * 100;

  const sectorsHeld = new Set(entries.map(([t]) => findStock(t).sector)).size;
  const diversLabel = sectorsHeld >= 5 ? "Good" : sectorsHeld >= 3 ? "Moderate" : "Low";
  const diversPct = Math.min(100, (sectorsHeld / 6) * 100);

  const overall = (concPct + volPct + (100 - diversPct)) / 3;
  const overallLabel = overall > 65 ? "High" : overall > 35 ? "Medium" : "Low";
  const overallColor = overall > 65 ? "var(--bear)" : overall > 35 ? "var(--gold)" : "var(--bull)";

  el.innerHTML = `
    <div class="gauge-wrap">
      <div class="gauge-value" style="color:${overallColor}">${overallLabel} risk</div>
      <div class="gauge-label">Based on your current open positions</div>
    </div>
    <div class="risk-metric-list">
      ${riskMetricRow("Concentration", concLabel, concPct)}
      ${riskMetricRow("Sector volatility", volLabel, volPct)}
      ${riskMetricRow("Diversification", diversLabel, diversPct)}
    </div>
    <p class="risk-note">Concentration measures how much of your portfolio sits in a small number of positions. Sector volatility reflects the historical choppiness of the sectors you hold. This is a simplified simulation, not investment advice.</p>`;
}
function riskMetricRow(label, tag, pct) {
  const color = pct > 65 ? "var(--bear)" : pct > 35 ? "var(--gold)" : "var(--bull)";
  return `<div class="risk-metric">
    <span>${label}</span>
    <span class="risk-metric__bar"><span class="risk-metric__fill" style="width:${pct}%; background:${color}"></span></span>
    <span style="color:${color}; font-weight:600;">${tag}</span>
  </div>`;
}

/* ---------------------------- Trade drawer ---------------------------- */
const drawerOverlay = document.getElementById("drawerOverlay");
let drawerTicker = null, drawerSide = "BUY";

function openDrawer(ticker, side = "BUY") {
  drawerTicker = ticker;
  drawerSide = side;
  document.querySelectorAll(".drawer__tabs button").forEach((b) => b.classList.toggle("is-active", b.dataset.side === side));
  renderDrawer();
  drawerOverlay.classList.add("is-open");
}
function closeDrawer() { drawerOverlay.classList.remove("is-open"); drawerTicker = null; }
document.getElementById("drawerClose").addEventListener("click", closeDrawer);
drawerOverlay.addEventListener("click", (e) => { if (e.target === drawerOverlay) closeDrawer(); });
document.querySelectorAll(".drawer__tabs button").forEach((btn) => btn.addEventListener("click", () => { drawerSide = btn.dataset.side; document.querySelectorAll(".drawer__tabs button").forEach((b) => b.classList.toggle("is-active", b === btn)); renderDrawer(); }));

function renderDrawer() {
  if (!drawerTicker) return;
  const q = getQuote(drawerTicker);
  const up = q.changePct >= 0;
  const currency = q.market === "US" ? "USD" : "AUD";

  document.getElementById("drawerTicker").textContent = q.ticker;
  document.getElementById("drawerName").textContent = q.name;
  document.getElementById("drawerMarketTag").textContent = q.market;
  document.getElementById("drawerMarketTag").className = `market-tag ${q.market}`;
  document.getElementById("drawerPrice").textContent = fmtMoney(q.price, currency);
  const chgEl = document.getElementById("drawerChange");
  chgEl.textContent = fmtPct(q.changePct);
  chgEl.className = `chg ${up ? "up" : "down"}`;

  const posEl = document.getElementById("drawerPosition");
  const holding = STATE.holdings[drawerTicker];
  if (holding) {
    const priceAUD = toAUD(q.price, q.market);
    const costAUD = toAUD(holding.avgCost, q.market);
    const pnl = (priceAUD - costAUD) * holding.qty;
    posEl.classList.add("is-visible");
    posEl.innerHTML = `<span>You hold <b>${holding.qty}</b> sh</span><span>Avg cost <b>${fmtMoney(costAUD)}</b></span><span>Unrealised <b style="color:${pnl >= 0 ? "var(--bull)" : "var(--bear)"}">${fmtMoney(pnl)}</b></span>`;
  } else {
    posEl.classList.remove("is-visible");
    posEl.innerHTML = "";
  }

  document.getElementById("tradeSubmitBtn").textContent = drawerSide === "BUY" ? "Buy" : "Sell";
  document.getElementById("tradeSubmitBtn").className = `btn btn--block ${drawerSide === "BUY" ? "btn--primary" : "btn--danger"}`;
  document.getElementById("tradeQty").value = 1;
  document.getElementById("tradeError").textContent = "";
  updateTradeSummary();
  renderDrawerChart();
}
function updateTradeSummary() {
  const q = getQuote(drawerTicker);
  const qty = Math.max(1, parseInt(document.getElementById("tradeQty").value, 10) || 1);
  const priceAUD = toAUD(q.price, q.market);
  document.getElementById("tradeEstPrice").textContent = fmtMoney(priceAUD);
  document.getElementById("tradeEstTotal").textContent = fmtMoney(priceAUD * qty);
}
document.getElementById("tradeQty").addEventListener("input", updateTradeSummary);
function renderDrawerChart() {
  const ctx = document.getElementById("drawerChart");
  const buf = priceHistoryBuf[drawerTicker];
  const up = buf[buf.length - 1] >= buf[0];
  const color = up ? "#00E58A" : "#FF4D5E";
  if (drawerChart) drawerChart.destroy();
  drawerChart = new Chart(ctx, {
    type: "line",
    data: { labels: buf.map((_, i) => i), datasets: [{ data: buf, borderColor: color, borderWidth: 2, pointRadius: 0, tension: 0.35, fill: true, backgroundColor: up ? "rgba(0,229,138,0.08)" : "rgba(255,77,94,0.08)" }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } },
  });
}

document.getElementById("tradeForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const qty = parseInt(document.getElementById("tradeQty").value, 10);
  const errEl = document.getElementById("tradeError");
  if (!qty || qty < 1) { errEl.textContent = "Enter a valid quantity."; return; }
  const result = executeTrade(drawerTicker, drawerSide, qty);
  if (!result.ok) { errEl.textContent = result.error; return; }
  const q2 = getQuote(drawerTicker);
  showToast(`${drawerSide === "BUY" ? "Bought" : "Sold"} ${qty} × ${drawerTicker} at ${fmtMoney(q2.price, q2.market === "US" ? "USD" : "AUD")}.`, "success");
  closeDrawer();
  renderTopWidgets();
  renderActiveView();
});

/* ---------------------------- Search ---------------------------- */
const searchInput = document.getElementById("globalSearch");
const searchResults = document.getElementById("searchResults");
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) { searchResults.classList.remove("is-open"); return; }
  const matches = STOCK_UNIVERSE.filter((s) => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)).slice(0, 8);
  if (!matches.length) { searchResults.innerHTML = `<div class="search-row"><span class="search-row__name">No matches</span></div>`; searchResults.classList.add("is-open"); return; }
  searchResults.innerHTML = matches.map((s) => {
    return `<div class="search-row" data-pick="${s.ticker}">
      <div class="search-row__left"><span class="search-row__ticker">${s.ticker}</span><span class="search-row__name">${s.name}</span></div>
      <span class="market-tag ${s.market}">${s.market}</span>
    </div>`;
  }).join("");
  searchResults.classList.add("is-open");
  searchResults.querySelectorAll("[data-pick]").forEach((row) => row.addEventListener("click", () => {
    openDrawer(row.dataset.pick, "BUY");
    searchInput.value = ""; searchResults.classList.remove("is-open");
  }));
});
document.addEventListener("click", (e) => { if (!e.target.closest(".topbar__search")) searchResults.classList.remove("is-open"); });

/* ---------------------------- Toast ---------------------------- */
let toastTimer;
function showToast(msg, type = "success") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast is-visible ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-visible"), 3200);
}

/* ---------------------------- Logout ---------------------------- */
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("ys_session");
  window.location.href = "index.html";
});

/* ---------------------------- Boot + tick loop ---------------------------- */
function init() {
  initSectorFilter();
  buildTickerTape();
  renderTopWidgets();
  renderActiveView();

  setInterval(() => {
    MarketEngine.tick();
    pushPriceHistory();
    updateTickerTape();
    renderTopWidgets();
    renderActiveView();
    if (drawerOverlay.classList.contains("is-open") && drawerTicker) renderDrawer();
  }, 2500);

  // Sample portfolio value periodically so the performance chart has motion
  setInterval(() => {
    STATE.portfolioHistory.push({ ts: Date.now(), value: portfolioValueAUD() });
    if (STATE.portfolioHistory.length > 400) STATE.portfolioHistory.shift();
    saveState();
  }, 15000);
}
init();
