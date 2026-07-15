# YourStocks — Paper Trading Platform

A dark, modern paper-trading dashboard for ASX and US stocks: login/signup, live-feeling simulated prices, a portfolio with PnL, a risk profile quiz, and a portfolio risk snapshot. Pure HTML/CSS/JS — no build step, no server — so it hosts directly on GitHub Pages.

## Host it on GitHub Pages

1. Create a new GitHub repository (e.g. `yourstocks`).
2. Upload **all** files in this folder, keeping the same structure:
   ```
   index.html
   dashboard.html
   css/style.css
   js/data.js
   js/market.js
   js/auth.js
   js/app.js
   assets/logo.png
   ```
   Easiest way: on the repo page, click **Add file → Upload files**, drag the whole folder in, and commit.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to `Deploy from a branch`, branch `main`, folder `/ (root)`. Save.
5. GitHub gives you a URL like `https://<your-username>.github.io/yourstocks/` within a minute or two — that's your live site, landing on the login/signup page.

No API keys, no `npm install`, no backend to configure.

## How it works (important to know)

GitHub Pages only serves static files — there's no database and no server-side code. So this app simulates everything client-side:

- **Accounts & login** are stored in the browser's `localStorage`, with passwords SHA-256 hashed before saving. This is fine for a personal demo/portfolio piece, but it is **not real authentication security** — anyone using the same browser can see the stored data via dev tools, and accounts don't sync across devices or browsers. Don't reuse a real password.
- **Stock prices are simulated**, not real market data. Each stock gets a realistic starting price and then drifts with a small random walk every ~2.5 seconds, with volatility tuned per sector. There's no live feed involved (a static site can't hold a market-data API key securely), so treat prices as illustrative, not accurate.
- **All trades are paper trades.** Every new account starts with $100,000 AUD in simulated cash. US stock trades are converted to AUD at a fixed mock exchange rate (1 USD = 1.52 AUD) — also not live.
- **Market hours** for the ASX-open/closed badges and US-open/closed badges use real timezone rules (`Australia/Sydney` and `America/New_York`), so the open/closed status and countdowns are accurate to the real trading calendar (Mon–Fri, ASX 10:00–16:00 AEST/AEDT, US 9:30am–4:00pm ET) — it's only the prices themselves that are simulated.
- **Data is per-browser.** Clearing site data/localStorage, or opening the site in a different browser or incognito window, resets everything for that account.

## Structure

- `index.html` — landing page, login/signup only (the entry point of the site)
- `dashboard.html` — the trading platform, redirected to after login
- `css/style.css` — all styling
- `js/data.js` — the stock universe (ASX + US tickers) and the price-simulation engine
- `js/market.js` — ASX/US market-hours logic
- `js/auth.js` — signup/login logic for `index.html`
- `js/app.js` — the trading platform logic for `dashboard.html` (portfolio, trades, risk profile, charts)
- `assets/logo.png` — your logo

## Customising

- **Add/remove stocks**: edit the `STOCK_UNIVERSE` array in `js/data.js`.
- **Starting balance**: change `STARTING_BALANCE` in `js/auth.js`.
- **USD→AUD rate**: change `FX_USD_TO_AUD` in `js/data.js`.
- **Colours/fonts**: all design tokens are CSS variables at the top of `css/style.css`.

## Disclaimer

YourStocks is a simulation for demonstration and learning purposes. It uses paper money and simulated prices only. The risk-profile quiz gives general, simplified information — it is not personal financial advice.
