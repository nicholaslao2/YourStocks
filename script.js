/* script.js
   Minimal interactive logic for the TradingView-inspired layout
   No external libraries required
*/

(() => {
  // Sample watchlist data
  const symbols = [
    { symbol: 'BTCUSD', price: 64250.12, change: 0.012 },
    { symbol: 'ETHUSD', price: 4200.45, change: -0.008 },
    { symbol: 'AAPL', price: 174.22, change: 0.006 },
    { symbol: 'TSLA', price: 214.88, change: -0.023 },
    { symbol: 'EURUSD', price: 1.0823, change: 0.0004 }
  ];

  // State
  let active = null;
  const positions = [];

  // DOM refs
  const watchlistEl = document.getElementById('watchlist');
  const activeSymbolEl = document.getElementById('activeSymbol');
  const activeMetaEl = document.getElementById('activeMeta');
  const orderSymbolEl = document.getElementById('orderSymbol');
  const orderPriceEl = document.getElementById('orderPrice');
  const chartCanvas = document.getElementById('chartCanvas');
  const ctx = chartCanvas.getContext('2d');
  const positionsTableBody = document.querySelector('#positionsTable tbody');
  const toast = document.getElementById('toast');

  // Render watchlist
  function renderWatchlist() {
    watchlistEl.innerHTML = '';
    symbols.forEach(s => {
      const item = document.createElement('div');
      item.className = 'item' + (s.change < 0 ? ' negative' : '');
      item.setAttribute('role','listitem');
      item.innerHTML = `
        <div>
          <div class="symbol">${s.symbol}</div>
          <div class="meta" style="font-size:12px">${formatPrice(s.price)}</div>
        </div>
        <div style="text-align:right">
          <div class="change">${formatChange(s.change)}</div>
          <div class="meta" style="font-size:12px">${(s.change*100).toFixed(2)}%</div>
        </div>
      `;
      item.addEventListener('click', () => setActiveSymbol(s.symbol));
      watchlistEl.appendChild(item);
    });
  }

  // Helpers
  function formatPrice(p) {
    if (p >= 1000) return p.toLocaleString(undefined, {maximumFractionDigits:2});
    if (p >= 1) return p.toFixed(4);
    return p.toPrecision(6);
  }
  function formatChange(c) {
    return (c >= 0 ? '+' : '') + (c * 100).toFixed(2) + '%';
  }

  // Set active symbol
  function setActiveSymbol(sym) {
    active = symbols.find(s => s.symbol === sym);
    if (!active) return;
    activeSymbolEl.textContent = active.symbol;
    activeMetaEl.textContent = `Price ${formatPrice(active.price)} • Change ${(active.change*100).toFixed(2)}%`;
    orderSymbolEl.textContent = active.symbol;
    orderPriceEl.textContent = formatPrice(active.price);
    drawChart(generateSeries(active.price));
  }

  // Mock live updates
  function randomWalk(p) {
    const vol = Math.max(0.0005, Math.abs(p) * 0.0005);
    return p * (1 + (Math.random() - 0.5) * vol);
  }
  function updatePrices() {
    symbols.forEach(s => {
      const old = s.price;
      s.price = randomWalk(s.price);
      s.change = (s.price - old) / old;
    });
    renderWatchlist();
    if (active) {
      orderPriceEl.textContent = formatPrice(active.price);
      activeMetaEl.textContent = `Price ${formatPrice(active.price)} • Change ${(active.change*100).toFixed(2)}%`;
      drawChart(generateSeries(active.price));
    }
  }

  // Simple sparkline chart drawing
  function generateSeries(latest) {
    // create a small series around latest
    const points = 80;
    const arr = new Array(points).fill(0).map((_,i) => {
      const jitter = (Math.sin(i/6) + Math.random()*0.6 - 0.3) * (latest * 0.002);
      return latest + jitter - (points - i) * (latest * 0.00002);
    });
    arr[arr.length - 1] = latest;
    return arr;
  }

  function drawChart(series) {
    const w = chartCanvas.width = chartCanvas.clientWidth || 1200;
    const h = chartCanvas.height = chartCanvas.clientHeight || 600;
    ctx.clearRect(0,0,w,h);

    // background grid
    ctx.fillStyle = '#07101a';
    ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let i=1;i<4;i++){
      ctx.beginPath();
      ctx.moveTo(0, h * i / 4);
      ctx.lineTo(w, h * i / 4);
      ctx.stroke();
    }

    // series path
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = max - min || 1;
    ctx.beginPath();
    series.forEach((v,i) => {
      const x = (i / (series.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.strokeStyle = 'rgba(59,130,246,0.95)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // fill under curve
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0,0,0,h);
    grad.addColorStop(0, 'rgba(59,130,246,0.12)');
    grad.addColorStop(1, 'rgba(59,130,246,0.02)');
    ctx.fillStyle = grad;
    ctx.fill();

    // latest price label
    const last = series[series.length - 1];
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(w - 110, 12, 100, 28);
    ctx.fillStyle = '#e6eef8';
    ctx.font = '600 14px ' + getComputedStyle(document.documentElement).getPropertyValue('--font-sans');
    ctx.fillText(formatPrice(last), w - 100, 32);
  }

  // Orders
  function placeOrder(side) {
    if (!active) return showToast('Select a symbol first', true);
    const qty = parseFloat(document.getElementById('qty').value) || 0;
    if (qty <= 0) return showToast('Enter a valid quantity', true);
    const price = active.price;
    // mock fill
    const pos = positions.find(p => p.symbol === active.symbol);
    if (pos) {
      // update avg
      const total = pos.qty * pos.avg + qty * price;
      pos.qty += qty;
      pos.avg = total / pos.qty;
    } else {
      positions.push({ symbol: active.symbol, qty, avg: price });
    }
    renderPositions();
    showToast(`${side} ${qty} ${active.symbol} @ ${formatPrice(price)}`);
  }

  function renderPositions() {
    positionsTableBody.innerHTML = '';
    positions.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${p.symbol}</td><td>${p.qty}</td><td>${formatPrice(p.avg)}</td>`;
      positionsTableBody.appendChild(tr);
    });
  }

  // Toast helper
  let toastTimer = null;
  function showToast(msg, isError = false) {
    toast.style.display = 'block';
    toast.style.background = isError ? 'linear-gradient(90deg,#3b0b0b,#5a0b0b)' : 'rgba(0,0,0,0.6)';
    toast.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.style.display = 'none', 3000);
  }

  // UI toggles
  document.getElementById('toggleSidebar').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('hidden');
  });
  document.getElementById('toggleRight').addEventListener('click', () => {
    document.querySelector('.right-panel').classList.toggle('hidden');
  });

  // Search quick add
  document.getElementById('addSymbolBtn').addEventListener('click', () => {
    const s = prompt('Add symbol e.g. SOLUSD');
    if (!s) return;
    symbols.unshift({ symbol: s.toUpperCase(), price: Math.round(Math.random()*1000)/10 + 10, change: 0 });
    renderWatchlist();
    showToast(`${s.toUpperCase()} added`);
  });

  // Symbol search quick select
  document.getElementById('symbolSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim().toUpperCase();
      if (!q) return;
      const found = symbols.find(s => s.symbol === q);
      if (found) setActiveSymbol(found.symbol);
      else {
        symbols.unshift({ symbol: q, price: Math.round(Math.random()*1000)/10 + 10, change: 0 });
        renderWatchlist();
        setActiveSymbol(q);
      }
      e.target.value = '';
    }
  });

  // Order buttons
  document.getElementById('buyBtn').addEventListener('click', () => placeOrder('Buy'));
  document.getElementById('sellBtn').addEventListener('click', () => placeOrder('Sell'));
  document.getElementById('placeOrder').addEventListener('click', () => {
    const type = document.getElementById('orderType').value;
    placeOrder(type === 'Market' ? 'Buy' : 'Buy');
  });

  // Responsive redraw on resize
  window.addEventListener('resize', () => {
    if (active) drawChart(generateSeries(active.price));
  });

  // Init
  renderWatchlist();
  // set first symbol active
  setActiveSymbol(symbols[0].symbol);

  // Simulate live feed
  setInterval(updatePrices, 1500);

})();
