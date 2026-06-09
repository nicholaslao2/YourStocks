/* script.js
   YourStocks – advanced trading dashboard
   - 100+ instruments
   - Candlestick chart (Lightweight Charts)
   - Trendlines + horizontal lines (SL/TP)
   - Paper orders
*/

(() => {
  // ---------- CONFIG: DATA PROVIDER ----------

  // Choose a provider and wire it up.
  // Examples (you must sign up and get an API key):
  // - TradingView Data API via RapidAPI 
  // - Alpha Vantage (free tier, delayed) 
  // - Polygon / Finnhub / Twelve Data, etc. 

  const DATA_PROVIDER = {
    type: 'mock', // 'mock' or 'api'
    apiKey: 'YOUR_API_KEY_HERE', // put your key here when using 'api'
    // Example endpoint (pseudo):
    // url: 'https://example.com/ohlcv?symbol={symbol}&interval={interval}'
  };

  // ---------- SYMBOL UNIVERSE (100+ instruments) ----------

  const SYMBOLS = [
    // US large caps
    'AAPL','MSFT','GOOGL','AMZN','META','TSLA','NVDA','BRK.B','JPM','V','JNJ',
    'WMT','PG','MA','HD','XOM','PFE','KO','DIS','NFLX','ADBE','CRM','CSCO',
    'INTC','PEP','T','BAC','C','NKE','MCD','VZ','ABNB','UBER','SHOP','SQ',
    // Indices
    'SPY','QQQ','DIA','IWM','NDX','DJI',
    // FX majors
    'EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD','USDCHF','NZDUSD',
    // Crypto majors
    'BTCUSD','ETHUSD','SOLUSD','XRPUSD','LTCUSD','DOGEUSD','ADAUSD',
    // Commodities / ETFs
    'GLD','SLV','USO','UNG','GDX','XLK','XLF','XLE','XLV','XLY','XLP',
    // More US stocks
    'ORCL','IBM','AMD','QCOM','TXN','BA','CAT','GE','HON','LMT','TMO',
    'MRK','ABBV','CVX','COP','LOW','COST','BKNG','AXP','GS','BLK','SPGI',
    'INTU','PYPL','ZM','ROKU','SNOW','PLTR','RBLX','COIN','HOOD','SOFI',
    // Random extras
    'BABA','TCEHY','NIO','LI','XPEV','RIO','BHP','CSL.AX','CBA.AX','NAB.AX'
  ];

  // ---------- STATE ----------

  let activeSymbol = null;
  let activeInterval = '60'; // default 1h
  let chart, candleSeries;
  let drawings = []; // { type: 'trendline'|'hline', line }
  let drawingMode = 'select'; // 'select' | 'trendline' | 'hline'
  let tempTrend = null;
  const positions = [];

  // ---------- DOM ----------

  const watchlistEl = document.getElementById('watchlist');
  const activeSymbolEl = document.getElementById('activeSymbol');
  const activeMetaEl = document.getElementById('activeMeta');
  const orderSymbolEl = document.getElementById('orderSymbol');
  const orderPriceEl = document.getElementById('orderPrice');
  const statusLeftEl = document.getElementById('statusLeft');
  const dataSourceSelect = document.getElementById('dataSource');
  const timeframeSelect = document.getElementById('timeframe');
  const toast = document.getElementById('toast');
  const positionsTableBody = document.querySelector('#positionsTable tbody');

  const qtyInput = document.getElementById('qty');
  const stopLossInput = document.getElementById('stopLossInput');
  const takeProfitInput = document.getElementById('takeProfitInput');

  // ---------- UTIL ----------

  function showToast(msg, isError = false) {
    toast.style.display = 'block';
    toast.style.background = isError ? 'linear-gradient(90deg,#3b0b0b,#5a0b0b)' : 'rgba(0,0,0,0.6)';
    toast.textContent = msg;
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.style.display = 'none', 3000);
  }

  function formatPrice(p) {
    if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(4);
    return p.toPrecision(6);
  }

  function nowSec() {
    return Math.floor(Date.now() / 1000);
  }

  // ---------- WATCHLIST ----------

  function renderWatchlist() {
    watchlistEl.innerHTML = '';
    SYMBOLS.forEach(sym => {
      const item = document.createElement('div');
      item.className = 'item';
      item.setAttribute('role','listitem');
      item.innerHTML = `
        <div>
          <div class="symbol">${sym}</div>
          <div class="meta" style="font-size:12px">Tap to load candles</div>
        </div>
        <div class="meta" style="font-size:12px;text-align:right">—</div>
      `;
      item.addEventListener('click', () => setActiveSymbol(sym));
      watchlistEl.appendChild(item);
    });
  }

  // ---------- CHART INIT ----------

  function initChart() {
    const container = document.getElementById('tvChart');
    chart = LightweightCharts.createChart(container, {
      layout: {
        background: { type: 'Solid', color: '#07101a' },
        textColor: '#e6eef8',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.12)',
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.12)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
    });

    candleSeries = chart.addCandlestickSeries({
      upColor: '#00b894',
      downColor: '#ff6b6b',
      borderUpColor: '#00b894',
      borderDownColor: '#ff6b6b',
      wickUpColor: '#00b894',
      wickDownColor: '#ff6b6b',
    });

    // Resize on window resize
    window.addEventListener('resize', () => {
      const rect = container.getBoundingClientRect();
      chart.applyOptions({ width: rect.width, height: rect.height });
    });
    const rect = container.getBoundingClientRect();
    chart.applyOptions({ width: rect.width, height: rect.height });

    // Mouse events for drawing
    const dom = chart._internal__chartWidget._internal_chartPaneView._private__canvasBinding.canvas; // internal, but works
    dom.addEventListener('mousedown', onMouseDown);
    dom.addEventListener('mousemove', onMouseMove);
    dom.addEventListener('mouseup', onMouseUp);
  }

  // ---------- DATA FETCHING ----------

  async function fetchCandles(symbol, interval) {
    const source = dataSourceSelect.value;
    if (source === 'mock') {
      return generateMockCandles();
    }

    // REAL API MODE (you must implement this for your provider)
    if (!DATA_PROVIDER.apiKey || DATA_PROVIDER.apiKey === 'YOUR_API_KEY_HERE') {
      showToast('Set your API key in script.js to use real data', true);
      return generateMockCandles();
    }

    try {
      // Example pseudo-call – replace with your provider’s URL & params
      // const url = DATA_PROVIDER.url
      //   .replace('{symbol}', symbol)
      //   .replace('{interval}', interval);
      // const res = await fetch(url, { headers: { 'X-API-Key': DATA_PROVIDER.apiKey } });
      // const json = await res.json();
      // return mapYourProviderToCandles(json);

      // For now, still mock to keep it runnable:
      return generateMockCandles();
    } catch (e) {
      console.error(e);
      showToast('Error fetching data, using mock instead', true);
      return generateMockCandles();
    }
  }

  function generateMockCandles() {
    const candles = [];
    const now = nowSec();
    const bars = 200;
    let price = 100 + Math.random() * 50;
    for (let i = bars; i >= 0; i--) {
      const t = now - i * 60 * 60; // hourly bars
      const o = price;
      const change = (Math.random() - 0.5) * 2;
      const c = o + change;
      const h = Math.max(o, c) + Math.random() * 1.5;
      const l = Math.min(o, c) - Math.random() * 1.5;
      candles.push({ time: t, open: o, high: h, low: l, close: c });
      price = c;
    }
    return candles;
  }

  // ---------- SET ACTIVE SYMBOL ----------

  async function setActiveSymbol(symbol) {
    activeSymbol = symbol;
    activeSymbolEl.textContent = symbol;
    activeMetaEl.textContent = 'Loading candles...';
    orderSymbolEl.textContent = symbol;

    const candles = await fetchCandles(symbol, activeInterval);
    candleSeries.setData(candles);

    const last = candles[candles.length - 1];
    const lastPrice = last ? last.close : null;
    if (lastPrice != null) {
      orderPriceEl.textContent = formatPrice(lastPrice);
      activeMetaEl.textContent = `Last ${formatPrice(lastPrice)} • ${candles.length} bars`;
    } else {
      orderPriceEl.textContent = '—';
      activeMetaEl.textContent = 'No data';
    }
  }

  // ---------- DRAWING TOOLS ----------

  function setDrawingMode(mode) {
    drawingMode = mode;
    showToast(`Tool: ${mode}`);
  }

  function clearDrawings() {
    drawings.forEach(d => d.line.remove());
    drawings = [];
  }

  function priceFromY(y) {
    const priceScale = chart.priceScale('right');
    const coord = priceScale.coordinateToPrice(y);
    return coord;
  }

  function timeFromX(x) {
    const timeScale = chart.timeScale();
    const coord = timeScale.coordinateToTime(x);
    return coord;
  }

  function onMouseDown(e) {
    if (drawingMode === 'trendline') {
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const t = timeFromX(x);
      const p = priceFromY(y);
      if (!t || !p) return;
      tempTrend = {
        start: { time: t, price: p },
        end: { time: t, price: p },
      };
      const line = chart.addLineSeries({
        color: '#3b82f6',
        lineWidth: 2,
      });
      line.setData([
        { time: t, value: p },
        { time: t, value: p },
      ]);
      tempTrend.line = line;
    } else if (drawingMode === 'hline') {
      const rect = e.target.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const p = priceFromY(y);
      if (!p) return;
      const line = chart.addLineSeries({
        color: '#facc15',
        lineWidth: 1,
      });
      const ts = chart.timeScale().getVisibleRange();
      const t1 = ts ? ts.from : nowSec() - 60 * 60 * 24;
      const t2 = ts ? ts.to : nowSec();
      line.setData([
        { time: t1, value: p },
        { time: t2, value: p },
      ]);
      drawings.push({ type: 'hline', line, price: p });
      showToast(`Horizontal line at ${formatPrice(p)}`);
    }
  }

  function onMouseMove(e) {
    if (!tempTrend || drawingMode !== 'trendline') return;
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const t = timeFromX(x);
    const p = priceFromY(y);
    if (!t || !p) return;
    tempTrend.end = { time: t, price: p };
    tempTrend.line.setData([
      { time: tempTrend.start.time, value: tempTrend.start.price },
      { time: tempTrend.end.time, value: tempTrend.end.price },
    ]);
  }

  function onMouseUp() {
    if (tempTrend && drawingMode === 'trendline') {
      drawings.push({ type: 'trendline', line: tempTrend.line, ...tempTrend });
      tempTrend = null;
    }
  }

  // ---------- ORDERS (PAPER) ----------

  function placeOrder(side) {
    if (!activeSymbol) {
      showToast('Select a symbol first', true);
      return;
    }
    const qty = parseFloat(qtyInput.value) || 0;
    if (qty <= 0) {
      showToast('Enter a valid quantity', true);
      return;
    }
    const entry = orderPriceEl.textContent === '—' ? null : parseFloat(orderPriceEl.textContent.replace(/,/g,''));
    const sl = parseFloat(stopLossInput.value) || null;
    const tp = parseFloat(takeProfitInput.value) || null;

    positions.push({ symbol: activeSymbol, side, qty, entry, sl, tp });
    renderPositions();
    showToast(`Paper ${side} ${qty} ${activeSymbol} @ ${entry ? formatPrice(entry) : 'MKT'}`);
  }

  function renderPositions() {
    positionsTableBody.innerHTML = '';
    positions.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.symbol}</td>
        <td>${p.side}</td>
        <td>${p.qty}</td>
        <td>${p.entry ? formatPrice(p.entry) : 'MKT'}</td>
        <td>${p.sl ? formatPrice(p.sl) : '—'}</td>
        <td>${p.tp ? formatPrice(p.tp) : '—'}</td>
      `;
      positionsTableBody.appendChild(tr);
    });
  }

  // ---------- UI HOOKUP ----------

  document.getElementById('toggleSidebar').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('hidden');
  });
  document.getElementById('toggleRight').addEventListener('click', () => {
    document.querySelector('.right-panel').classList.toggle('hidden');
  });

  document.getElementById('addSymbolBtn').addEventListener('click', () => {
    const s = prompt('Add symbol (e.g. SOLUSD, TSLA)');
    if (!s) return;
    const sym = s.toUpperCase();
    if (!SYMBOLS.includes(sym)) SYMBOLS.unshift(sym);
    renderWatchlist();
    showToast(`${sym} added to watchlist`);
  });

  document.getElementById('symbolSearch').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const q = e.target.value.trim().toUpperCase();
    if (!q) return;
    if (!SYMBOLS.includes(q)) SYMBOLS.unshift(q);
    renderWatchlist();
    setActiveSymbol(q);
    e.target.value = '';
  });

  timeframeSelect.addEventListener('change', () => {
    activeInterval = timeframeSelect.value;
    if (activeSymbol) setActiveSymbol(activeSymbol);
  });

  dataSourceSelect.addEventListener('change', () => {
    const mode = dataSourceSelect.value;
    if (mode === 'mock') {
      statusLeftEl.textContent = 'Disconnected • Using mock data';
    } else {
      statusLeftEl.textContent = 'API mode • Set your key in script.js';
    }
    if (activeSymbol) setActiveSymbol(activeSymbol);
  });

  document.getElementById('toolSelect').addEventListener('click', () => setDrawingMode('select'));
  document.getElementById('toolTrendline').addEventListener('click', () => setDrawingMode('trendline'));
  document.getElementById('toolHLine').addEventListener('click', () => setDrawingMode('hline'));
  document.getElementById('toolClear').addEventListener('click', () => {
    clearDrawings();
    showToast('Drawings cleared');
  });

  document.getElementById('buyBtn').addEventListener('click', () => placeOrder('BUY'));
  document.getElementById('sellBtn').addEventListener('click', () => placeOrder('SELL'));
  document.getElementById('placeOrder').addEventListener('click', () => placeOrder('BUY'));

  // ---------- INIT ----------

  renderWatchlist();
  initChart();
  setActiveSymbol(SYMBOLS[0]);
})();
