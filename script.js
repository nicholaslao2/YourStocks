// --- Application Storage Default State Architecture ---
let appState = {
    user: null,
    marketData: {
        AAPL: { name: "Apple", price: 175.50, change: 1.2 },
        MSFT: { name: "Microsoft", price: 415.20, change: -0.4 },
        GOOGL: { name: "Alphabet", price: 152.10, change: 0.8 },
        AMZN: { name: "Amazon", price: 178.40, change: 1.5 }
    },
    portfolio: [
        { symbol: "AAPL", shares: 40, avgBuy: 170.00 },
        { symbol: "MSFT", shares: 10, avgBuy: 410.00 }
    ],
    alerts: [],
    riskAssessment: null,
    simCash: 10000.00,
    simHistory: []
};

// --- Initialization Layer ---
document.addEventListener("DOMContentLoaded", () => {
    loadFromStorage();
    initMarketSimulation();
    renderDashboard();
    renderAlerts();
    renderSimulation();
    updateTradePrice();
});

// --- Functional: Navigation Tab Switching Logic ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active-tab'));
    document.querySelectorAll('.nav-links a').forEach(link => link.classList.remove('active'));
    
    document.getElementById(`${tabId}-tab`).classList.add('active-tab');
    event.target.classList.add('active');
}

// --- Transmission & Input: Secure Authentication Layer Simulation ---
function openAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

function handleAuth(event) {
    event.preventDefault();
    const userIn = document.getElementById('username').value;
    
    // Simulating Secure API Request Channel transmission to authenticate user credentials
    console.log("Transmitting encrypted user authentication structural token packet...");
    
    appState.user = userIn;
    saveToStorage();
    
    document.getElementById('authStatus').innerHTML = `<span>Welcome, <strong>${userIn}</strong></span>`;
    closeAuthModal();
}

// --- Transmission & Transmission Processing: Live Simulated Feed API System ---
function initMarketSimulation() {
    // Generates simulated live price updates continuously as the application runs
    setInterval(() => {
        for (let key in appState.marketData) {
            let variance = (Math.random() - 0.5) * 2; 
            appState.marketData[key].price = parseFloat((appState.marketData[key].price + variance).toFixed(2));
        }
        // Simulated structural output updates
        renderDashboard();
        updateTradePrice();
        checkAlertTriggerConditions();
    }, 4000); 
}

// --- Functional/Output: Dashboard View Syncing ---
function renderDashboard() {
    const feedEl = document.getElementById('marketFeed');
    if(feedEl) {
        feedEl.innerHTML = '';
        for (let key in appState.marketData) {
            let stock = appState.marketData[key];
            feedEl.innerHTML += `<li><span><strong>${key}</strong>: $${stock.price}</span> <span class="badge ${stock.change >= 0 ? 'positive' : ''}">${stock.change}%</span></li>`;
        }
    }

    const tableBody = document.querySelector('#portfolioTable tbody');
    if(tableBody) {
        tableBody.innerHTML = '';
        let totalVal = 0;
        
        appState.portfolio.forEach(item => {
            const currentPrice = appState.marketData[item.symbol].price;
            const totalItemValue = item.shares * currentPrice;
            const profitLoss = (currentPrice - item.avgBuy) * item.shares;
            totalVal += totalItemValue;
            
            tableBody.innerHTML += `
                <tr>
                    <td><strong>${item.symbol}</strong></td>
                    <td>${item.shares}</td>
                    <td>$${item.avgBuy.toFixed(2)}</td>
                    <td>$${currentPrice.toFixed(2)}</td>
                    <td>$${totalItemValue.toFixed(2)}</td>
                    <td style="color: ${profitLoss >= 0 ? 'var(--primary-green)' : 'red'}">$${profitLoss.toFixed(2)}</td>
                </tr>
            `;
        });
        
        document.getElementById('totalValue').innerText = `$${totalVal.toFixed(2)}`;
    }
}

// --- Functional/Input: Risk Profile Calculation Rules ---
function calculateRisk(event) {
    event.preventDefault();
    const q1 = parseInt(document.querySelector('input[name="q1"]:checked').value);
    const q2 = parseInt(document.querySelector('input[name="q2"]:checked').value);
    
    const operationalScore = q1 + q2;
    let computedProfile = "Conservative Profile";
    
    if (operationalScore > 4 && operationalScore <= 7) {
        computedProfile = "Balanced Strategy Profile";
    } else if (operationalScore > 7) {
        computedProfile = "Aggressive Growth Profile";
    }
    
    appState.riskAssessment = computedProfile;
    saveToStorage();
    
    const resultBox = document.getElementById('riskResult');
    resultBox.innerHTML = `<strong>Calculated Structural Outcome:</strong> Clear Risk Characterisation assigned as <strong>${computedProfile}</strong>. Disjointed evaluation error variables successfully removed.`;
    resultBox.classList.remove('hidden');
}

// --- Functional/Input: Price Alerts Mechanism ---
function createAlert(event) {
    event.preventDefault();
    const sym = document.getElementById('alertSymbol').value;
    const cond = document.getElementById('alertCondition').value;
    const price = parseFloat(document.getElementById('alertPrice').value);
    
    appState.alerts.push({ symbol: sym, condition: cond, targetPrice: price, triggered: false });
    saveToStorage();
    renderAlerts();
    document.getElementById('alertForm').reset();
}

function renderAlerts() {
    const list = document.getElementById('activeAlertsList');
    if(!list) return;
    list.innerHTML = '';
    
    appState.alerts.forEach((alert, index) => {
        list.innerHTML += `
            <li>
                <span>${alert.symbol} Condition: if value moves <strong>${alert.condition}</strong> $${alert.targetPrice}</span>
                <span class="badge ${alert.triggered ? 'positive' : ''}">${alert.triggered ? 'TRIGGERED TRANSMISSION' : 'Monitoring'}</span>
            </li>
        `;
    });
}

function checkAlertTriggerConditions() {
    appState.alerts.forEach(alert => {
        if(!alert.triggered) {
            let currentVal = appState.marketData[alert.symbol].price;
            if(alert.condition === "above" && currentVal >= alert.targetPrice) {
                alert.triggered = true;
                triggerPushNotificationTransmission(alert);
            } else if (alert.condition === "below" && currentVal <= alert.targetPrice) {
                alert.triggered = true;
                triggerPushNotificationTransmission(alert);
            }
        }
    });
}

function triggerPushNotificationTransmission(alert) {
    // Encrypted Alert API transmission notification layer emulation
    console.log(`Transmitting Encrypted Alert Target Vector Payload: ${alert.symbol} hit specified parameters.`);
    alert('YourStocks Alert Transmission Triggered: ' + alert.symbol + ' has reached your set parameter boundary of $' + alert.targetPrice);
    renderAlerts();
    saveToStorage();
}

// --- Functional: Simulated Trading Space Mechanics ---
function updateTradePrice() {
    const selectedSym = document.getElementById('tradeSymbol').value;
    const underlyingPrice = appState.marketData[selectedSym].price;
    document.getElementById('tradePriceDisplay').innerText = `$${underlyingPrice.toFixed(2)}`;
}

function executeTrade(event) {
    event.preventDefault();
    const sym = document.getElementById('tradeSymbol').value;
    const type = document.getElementById('tradeType').value;
    const qty = parseInt(document.getElementById('tradeQuantity').value);
    const execPrice = appState.marketData[sym].price;
    const costTotal = execPrice * qty;
    
    if(type === "BUY") {
        if(costTotal > appState.simCash) {
            alert("Insufficient simulated structural currency assets available inside profile parameters.");
            return;
        }
        appState.simCash -= costTotal;
        
        let position = appState.portfolio.find(p => p.symbol === sym);
        if(position) {
            position.avgBuy = ((position.avgBuy * position.shares) + costTotal) / (position.shares + qty);
            position.shares += qty;
        } else {
            appState.portfolio.push({ symbol: sym, shares: qty, avgBuy: execPrice });
        }
    } else { // SELL Engine Logic Execution
        let position = appState.portfolio.find(p => p.symbol === sym);
        if(!position || position.shares < qty) {
            alert("Execution Error: You hold insufficient physical shares of asset to process operations.");
            return;
        }
        appState.simCash += costTotal;
        position.shares -= qty;
        if(position.shares === 0) {
            appState.portfolio = appState.portfolio.filter(p => p.symbol !== sym);
        }
    }
    
    // Save history logs directly to state storage
    appState.simHistory.unshift(`${type} Order Transmitted Successfully: ${qty} units of ${sym} processed at rate of $${execPrice.toFixed(2)}`);
    saveToStorage();
    renderSimulation();
    renderDashboard();
}

function renderSimulation() {
    document.getElementById('simCash').innerText = `$${appState.simCash.toFixed(2)}`;
    const logContainer = document.getElementById('simHistoryLog');
    logContainer.innerHTML = '';
    appState.simHistory.forEach(log => {
        logContainer.innerHTML += `<li>${log}</li>`;
    });
}

// --- Storage Engine Layer Rules ---
function saveToStorage() {
    localStorage.setItem('YOURSTOCKS_state', JSON.stringify(appState));
}

function loadFromStorage() {
    let localData = localStorage.getItem('YOURSTOCKS_state');
    if(localData) {
        appState = JSON.parse(localData);
    }
}
