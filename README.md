# YourStocks — Paper Trading Platform

A dark, modern paper-trading dashboard for ASX and US stocks: login/signup, live-feeling simulated prices, a portfolio with PnL, a risk profile quiz, and a portfolio risk snapshot.

## This version is just two files

To avoid the folder/upload issues from the first version, everything is now bundled into two fully self-contained HTML files — the CSS, all the JavaScript, and the logo (as an embedded image) live *inside* `index.html` and `dashboard.html`. There is no `css/`, `js/`, or `assets/` folder anymore, so there's nothing for a drag-and-drop upload to flatten or break.

```
index.html       ← landing page: login / signup (the entry point)
dashboard.html   ← the trading platform, redirected to after login
```

That's it. Two files.

## Host it on GitHub Pages

1. Create a new GitHub repository (e.g. `yourstocks`).
2. On the repo page, click **Add file → Upload files**, drag in `index.html` and `dashboard.html` (just these two), and commit.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to `Deploy from a branch`, branch `main`, folder `/ (root)`. Save.
5. GitHub gives you a URL like `https://<your-username>.github.io/yourstocks/` within a minute or two — that's your live site, landing on the login/signup page.

No subfolders to worry about, no build step, no `npm install`, no backend.

## How it works (important to know)

GitHub Pages only serves static files — there's no database and no server-side code. So this app simulates everything client-side:

- **Accounts & login** are stored in the browser's `localStorage`, with passwords SHA-256 hashed before saving. This is fine for a personal demo/portfolio piece, but it is **not real authentication security** — anyone using the same browser can see the stored data via dev tools, and accounts don't sync across devices or browsers. Don't reuse a real password.
- **Stock prices are simulated**, not real market data. Each stock gets a realistic starting price and then drifts with a small random walk every ~2.5 seconds, with volatility tuned per sector.
- **All trades are paper trades.** Every new account starts with $100,000 AUD in simulated cash. US stock trades are converted to AUD at a fixed mock exchange rate (1 USD = 1.52 AUD) — also not live.
- **Market hours** for the ASX-open/closed badges and US-open/closed badges use real timezone rules (`Australia/Sydney` and `America/New_York`), so the open/closed status and countdowns are accurate to the real trading calendar (Mon–Fri, ASX 10:00–16:00 AEST/AEDT, US 9:30am–4:00pm ET) — only the prices themselves are simulated.
- **Data is per-browser.** Clearing site data/localStorage, or opening the site in a different browser or incognito window, resets everything for that account.
- Two things still load from the internet by absolute URL (unaffected by any folder issues): Google Fonts and Chart.js from a CDN. If your network blocks those, fonts/charts will fall back gracefully but still function.

## Customising

Everything is in the two HTML files now — open them in any text editor:

- **Add/remove stocks**: search for `STOCK_UNIVERSE` inside `dashboard.html`.
- **Starting balance**: search for `STARTING_BALANCE` inside `index.html`.
- **USD→AUD rate**: search for `FX_USD_TO_AUD` inside `dashboard.html`.
- **Colours/fonts**: search for `:root {` near the top of the `<style>` block in either file — both files share the same token list, so if you change one, copy the same change into the other to keep them in sync.

## Disclaimer

YourStocks is a simulation for demonstration and learning purposes. It uses paper money and simulated prices only. The risk-profile quiz gives general, simplified information — it is not personal financial advice.
