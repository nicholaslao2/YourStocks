/* ==========================================================================
   YourStocks — Market Data Module
   Static stock universe + a lightweight, seeded price-simulation engine.
   NOTE: This app runs entirely client-side (GitHub Pages has no backend),
   so there is no live market feed. Prices are simulated with a seeded
   random walk so they are consistent within a day and drift realistically
   tick to tick. Clearly a paper-trading sandbox, not real market data.
   ========================================================================== */

const FX_USD_TO_AUD = 1.52; // fixed mock rate, simulation only

const STOCK_UNIVERSE = [
  // ---------------- ASX (AUD) ----------------
  { ticker: "BHP", name: "BHP Group", market: "ASX", sector: "Materials", base: 43.20 },
  { ticker: "CBA", name: "Commonwealth Bank", market: "ASX", sector: "Financials", base: 162.50 },
  { ticker: "CSL", name: "CSL Limited", market: "ASX", sector: "Health Care", base: 289.40 },
  { ticker: "NAB", name: "National Australia Bank", market: "ASX", sector: "Financials", base: 39.80 },
  { ticker: "WBC", name: "Westpac Banking Corp", market: "ASX", sector: "Financials", base: 33.10 },
  { ticker: "ANZ", name: "ANZ Group Holdings", market: "ASX", sector: "Financials", base: 30.45 },
  { ticker: "WES", name: "Wesfarmers", market: "ASX", sector: "Consumer Discretionary", base: 76.90 },
  { ticker: "WOW", name: "Woolworths Group", market: "ASX", sector: "Consumer Staples", base: 33.60 },
  { ticker: "MQG", name: "Macquarie Group", market: "ASX", sector: "Financials", base: 221.00 },
  { ticker: "TLS", name: "Telstra Group", market: "ASX", sector: "Communication", base: 4.05 },
  { ticker: "RIO", name: "Rio Tinto", market: "ASX", sector: "Materials", base: 118.75 },
  { ticker: "FMG", name: "Fortescue", market: "ASX", sector: "Materials", base: 18.90 },
  { ticker: "GMG", name: "Goodman Group", market: "ASX", sector: "Real Estate", base: 34.20 },
  { ticker: "TCL", name: "Transurban Group", market: "ASX", sector: "Industrials", base: 13.10 },
  { ticker: "STO", name: "Santos", market: "ASX", sector: "Energy", base: 7.15 },
  { ticker: "WDS", name: "Woodside Energy", market: "ASX", sector: "Energy", base: 26.40 },
  { ticker: "ALL", name: "Aristocrat Leisure", market: "ASX", sector: "Consumer Discretionary", base: 47.30 },
  { ticker: "COL", name: "Coles Group", market: "ASX", sector: "Consumer Staples", base: 18.55 },
  { ticker: "QBE", name: "QBE Insurance Group", market: "ASX", sector: "Financials", base: 20.10 },
  { ticker: "REA", name: "REA Group", market: "ASX", sector: "Communication", base: 214.60 },
  { ticker: "JHX", name: "James Hardie Industries", market: "ASX", sector: "Materials", base: 42.80 },
  { ticker: "COH", name: "Cochlear", market: "ASX", sector: "Health Care", base: 298.50 },
  { ticker: "XRO", name: "Xero", market: "ASX", sector: "Information Technology", base: 168.20 },
  { ticker: "NXT", name: "NextDC", market: "ASX", sector: "Information Technology", base: 16.85 },
  { ticker: "PME", name: "Pro Medicus", market: "ASX", sector: "Health Care", base: 245.00 },
  { ticker: "SUN", name: "Suncorp Group", market: "ASX", sector: "Financials", base: 19.40 },
  { ticker: "ORG", name: "Origin Energy", market: "ASX", sector: "Utilities", base: 11.20 },
  { ticker: "AMC", name: "Amcor", market: "ASX", sector: "Materials", base: 15.60 },
  { ticker: "AGL", name: "AGL Energy", market: "ASX", sector: "Utilities", base: 10.85 },
  { ticker: "AIA", name: "Auckland Intl Airport", market: "ASX", sector: "Industrials", base: 7.65 },

  // ---------------- US (USD) ----------------
  { ticker: "AAPL", name: "Apple Inc.", market: "US", sector: "Information Technology", base: 224.30 },
  { ticker: "MSFT", name: "Microsoft Corp.", market: "US", sector: "Information Technology", base: 441.60 },
  { ticker: "GOOGL", name: "Alphabet Inc.", market: "US", sector: "Communication", base: 178.20 },
  { ticker: "AMZN", name: "Amazon.com Inc.", market: "US", sector: "Consumer Discretionary", base: 198.40 },
  { ticker: "NVDA", name: "NVIDIA Corp.", market: "US", sector: "Information Technology", base: 132.80 },
  { ticker: "META", name: "Meta Platforms", market: "US", sector: "Communication", base: 542.10 },
  { ticker: "TSLA", name: "Tesla Inc.", market: "US", sector: "Consumer Discretionary", base: 251.90 },
  { ticker: "BRK.B", name: "Berkshire Hathaway", market: "US", sector: "Financials", base: 452.30 },
  { ticker: "JPM", name: "JPMorgan Chase", market: "US", sector: "Financials", base: 213.70 },
  { ticker: "V", name: "Visa Inc.", market: "US", sector: "Financials", base: 289.50 },
  { ticker: "UNH", name: "UnitedHealth Group", market: "US", sector: "Health Care", base: 502.40 },
  { ticker: "XOM", name: "Exxon Mobil", market: "US", sector: "Energy", base: 118.20 },
  { ticker: "JNJ", name: "Johnson & Johnson", market: "US", sector: "Health Care", base: 152.60 },
  { ticker: "PG", name: "Procter & Gamble", market: "US", sector: "Consumer Staples", base: 168.90 },
  { ticker: "MA", name: "Mastercard Inc.", market: "US", sector: "Financials", base: 471.20 },
  { ticker: "HD", name: "Home Depot", market: "US", sector: "Consumer Discretionary", base: 384.50 },
  { ticker: "AVGO", name: "Broadcom Inc.", market: "US", sector: "Information Technology", base: 178.60 },
  { ticker: "CVX", name: "Chevron Corp.", market: "US", sector: "Energy", base: 154.30 },
  { ticker: "KO", name: "Coca-Cola Co.", market: "US", sector: "Consumer Staples", base: 68.40 },
  { ticker: "PEP", name: "PepsiCo Inc.", market: "US", sector: "Consumer Staples", base: 148.70 },
  { ticker: "COST", name: "Costco Wholesale", market: "US", sector: "Consumer Staples", base: 912.30 },
  { ticker: "ADBE", name: "Adobe Inc.", market: "US", sector: "Information Technology", base: 468.90 },
  { ticker: "NFLX", name: "Netflix Inc.", market: "US", sector: "Communication", base: 684.20 },
  { ticker: "AMD", name: "Advanced Micro Devices", market: "US", sector: "Information Technology", base: 138.40 },
  { ticker: "CRM", name: "Salesforce Inc.", market: "US", sector: "Information Technology", base: 267.80 },
  { ticker: "DIS", name: "Walt Disney Co.", market: "US", sector: "Communication", base: 112.60 },
  { ticker: "PYPL", name: "PayPal Holdings", market: "US", sector: "Financials", base: 79.30 },
  { ticker: "INTC", name: "Intel Corp.", market: "US", sector: "Information Technology", base: 23.40 },
  { ticker: "BA", name: "Boeing Co.", market: "US", sector: "Industrials", base: 178.90 },
  { ticker: "NKE", name: "Nike Inc.", market: "US", sector: "Consumer Discretionary", base: 74.20 },
];

/* Deterministic pseudo-random generator seeded by a string (mulberry32).
   Lets us derive "today's open" consistently across page loads/tabs. */
function seededRandom(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function todaySeed() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

/* Volatility bucket used for both price ticks and the risk-analysis engine */
const SECTOR_VOLATILITY = {
  "Information Technology": 0.9,
  "Communication": 0.75,
  "Consumer Discretionary": 0.8,
  "Financials": 0.5,
  "Health Care": 0.45,
  "Materials": 0.7,
  "Energy": 0.85,
  "Utilities": 0.35,
  "Consumer Staples": 0.3,
  "Real Estate": 0.55,
  "Industrials": 0.55,
};

/* MarketEngine keeps live simulated prices for every ticker in memory. */
const MarketEngine = (() => {
  const state = {}; // ticker -> { price, open, prevClose, vol }
  const seed = todaySeed();

  STOCK_UNIVERSE.forEach((s) => {
    const rng = seededRandom(seed + s.ticker);
    const vol = SECTOR_VOLATILITY[s.sector] || 0.5;
    // today's open drifts from base by up to ~1.5% * volatility
    const openDrift = (rng() - 0.5) * 0.03 * vol;
    const open = +(s.base * (1 + openDrift)).toFixed(2);
    // prev close drifts slightly the other way so "change" isn't always from base
    const prevDrift = (rng() - 0.5) * 0.025 * vol;
    const prevClose = +(s.base * (1 + prevDrift)).toFixed(2);
    state[s.ticker] = { price: open, open, prevClose, vol, dir: 0 };
  });

  function tick() {
    STOCK_UNIVERSE.forEach((s) => {
      const st = state[s.ticker];
      const step = (Math.random() - 0.5) * 0.006 * st.vol; // small per-tick drift
      // gentle mean reversion toward open so prices don't runaway over a session
      const reversion = (st.open - st.price) * 0.002;
      let next = st.price * (1 + step) + reversion;
      next = Math.max(next, s.base * 0.4); // floor so it never goes silly-low
      st.dir = next - st.price;
      st.price = +next.toFixed(2);
    });
  }

  function get(ticker) {
    return state[ticker];
  }

  function all() {
    return STOCK_UNIVERSE.map((s) => ({ ...s, ...state[s.ticker] }));
  }

  return { tick, get, all, FX_USD_TO_AUD };
})();

/* ---------------------------------------------------------------------- */
function toAUD(price, market) {
  return market === "US" ? price * FX_USD_TO_AUD : price;
}

function fmtMoney(value, currency = "AUD") {
  const symbol = currency === "USD" ? "US$" : "$";
  const neg = value < 0;
  const v = Math.abs(value).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${neg ? "-" : ""}${symbol}${v}`;
}

function fmtPct(value) {
  const neg = value < 0;
  return `${neg ? "" : "+"}${value.toFixed(2)}%`;
}

function findStock(ticker) {
  return STOCK_UNIVERSE.find((s) => s.ticker === ticker);
}
