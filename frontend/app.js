// App State
let coinsData = [];
let detailChartInstance = null;
let currentDetailCoinId = null;
let lastView = 'dashboard';

const coinIds = "bitcoin,ethereum,solana,ripple,cardano,dogecoin,pepe,shiba-inu,chainlink,ethena,cyberconnect,arkham,hamster-kombat,notcoin,catizen";

document.addEventListener('DOMContentLoaded', () => {
    fetchDashboardData();
});

const formatCurrency = (val) => {
    if (!val) return '$0.00';
    if (val >= 1e12) return '$' + (val / 1e12).toFixed(2) + ' Tn';
    if (val >= 1e9) return '$' + (val / 1e9).toFixed(2) + ' Mr';
    if (val >= 1e6) return '$' + (val / 1e6).toFixed(2) + ' Mn';
    if (val < 0.01) return '$' + val.toPrecision(3);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
};

const formatNumber = (val) => {
    if (!val) return 'Bilinmiyor';
    if (val >= 1e9) return (val / 1e9).toFixed(2) + ' Mr';
    if (val >= 1e6) return (val / 1e6).toFixed(2) + ' Mn';
    return new Intl.NumberFormat('en-US').format(Math.floor(val));
};

async function fetchDashboardData() {
    try {
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`);
        if (!res.ok) throw new Error("API Error");
        coinsData = await res.json();
        
        renderDashboard();
        renderMarketOverview();
    } catch (e) {
        console.error(e);
        document.getElementById('top-cards-container').innerHTML = '<div style="color:var(--danger)">Veri yüklenemedi. (Rate limit). Biraz bekleyip sayfayı yenileyin.</div>';
    }
}

async function renderMarketOverview() {
    // 1. Top Gainer / Loser
    if (coinsData && coinsData.length > 0) {
        let gainer = coinsData[0];
        let loser = coinsData[0];
        
        for(const coin of coinsData) {
            const change = coin.price_change_percentage_24h || 0;
            if (change > (gainer.price_change_percentage_24h || 0)) gainer = coin;
            if (change < (loser.price_change_percentage_24h || 0)) loser = coin;
        }

        // Gainer
        document.getElementById('gainer-icon').src = gainer.image;
        document.getElementById('gainer-icon').style.display = 'block';
        document.getElementById('gainer-name').textContent = gainer.symbol.toUpperCase();
        document.getElementById('gainer-change').textContent = '+' + gainer.price_change_percentage_24h.toFixed(2) + '%';
        document.getElementById('top-gainer-card').onclick = () => openDetail(gainer.id);

        // Loser
        document.getElementById('loser-icon').src = loser.image;
        document.getElementById('loser-icon').style.display = 'block';
        document.getElementById('loser-name').textContent = loser.symbol.toUpperCase();
        document.getElementById('loser-change').textContent = loser.price_change_percentage_24h.toFixed(2) + '%';
        document.getElementById('top-loser-card').onclick = () => openDetail(loser.id);
    }

    // 2. Fear and Greed Index
    try {
        const fgiRes = await fetch('https://api.alternative.me/fng/');
        const fgiData = await fgiRes.json();
        const fgi = fgiData.data[0];
        const val = parseInt(fgi.value);
        
        document.getElementById('fgi-value').textContent = val;
        
        let trText = "Bilinmiyor";
        let color = "var(--text-main)";
        
        if (val >= 0 && val <= 24) { trText = "Aşırı Korku"; color = "var(--danger)"; }
        else if (val >= 25 && val <= 46) { trText = "Korku"; color = "#f97316"; } // orange
        else if (val >= 47 && val <= 54) { trText = "Nötr"; color = "#eab308"; } // yellow
        else if (val >= 55 && val <= 74) { trText = "Açgözlülük"; color = "#84cc16"; } // lime
        else if (val >= 75 && val <= 100) { trText = "Aşırı Açgözlülük"; color = "var(--accent)"; }
        
        document.getElementById('fgi-text').textContent = trText;
        document.getElementById('fgi-value').style.color = color;
        document.getElementById('fgi-text').style.color = color;
    } catch(e) {
        console.error("FGI fetch error", e);
        document.getElementById('fgi-text').textContent = "HATA";
    }
}

function renderDashboard() {
    const cardsContainer = document.getElementById('top-cards-container');
    const tableBody = document.getElementById('table-body');
    
    cardsContainer.innerHTML = '';
    tableBody.innerHTML = '';

    coinsData.forEach((coin, index) => {
        const changeStr = coin.price_change_percentage_24h ? coin.price_change_percentage_24h.toFixed(2) + '%' : '0.00%';
        const isPositive = coin.price_change_percentage_24h >= 0;
        const colorClass = isPositive ? 'positive' : 'negative';
        const arrow = isPositive ? '▲' : '▼';
        const chartColor = isPositive ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)';
        
        if (index < 3) {
            // Render Card
            const card = document.createElement('div');
            card.className = 'coin-card';
            card.onclick = () => openDetail(coin.id);
            card.innerHTML = `
                <div class="card-header">
                    <img class="coin-icon" src="${coin.image}" alt="${coin.name}">
                    <div>
                        <p class="coin-name">${coin.name}</p>
                        <span class="coin-symbol">${coin.symbol}</span>
                    </div>
                </div>
                <p class="current-price">${formatCurrency(coin.current_price)}</p>
                <div class="price-change ${colorClass}">${arrow} ${changeStr}</div>
                <div class="mini-chart"><canvas id="card-chart-${coin.id}"></canvas></div>
            `;
            cardsContainer.appendChild(card);
            
            setTimeout(() => {
                createMiniChart(`card-chart-${coin.id}`, coin.sparkline_in_7d.price, chartColor, false);
            }, 0);
            
        } else {
            // Render Table Row
            const tr = document.createElement('tr');
            tr.onclick = () => openDetail(coin.id);
            tr.innerHTML = `
                <td style="color: var(--text-muted);">${index + 1}</td>
                <td>
                    <div class="table-coin-cell">
                        <img class="coin-icon" src="${coin.image}" alt="${coin.name}" style="width: 24px; height: 24px;">
                        <div>
                            <span style="font-weight: 600;">${coin.name}</span>
                            <span class="coin-symbol" style="margin-left: 8px;">${coin.symbol}</span>
                        </div>
                    </div>
                </td>
                <td style="font-weight: 600;">${formatCurrency(coin.current_price)}</td>
                <td class="price-change ${colorClass}">${arrow} ${changeStr}</td>
                <td>${formatCurrency(coin.market_cap)}</td>
                <td><div class="table-chart-wrapper"><canvas id="table-chart-${coin.id}"></canvas></div></td>
            `;
            tableBody.appendChild(tr);
            
            setTimeout(() => {
                createMiniChart(`table-chart-${coin.id}`, coin.sparkline_in_7d.price, chartColor, true);
            }, 0);
        }
    });
}

function createMiniChart(canvasId, data, color, isTable) {
    const el = document.getElementById(canvasId);
    if (!el) return;
    const ctx = el.getContext('2d');
    
    let bg = 'transparent';
    if (!isTable) {
        bg = ctx.createLinearGradient(0, 0, 0, 80);
        bg.addColorStop(0, color.replace('1)', '0.3)'));
        bg.addColorStop(1, color.replace('1)', '0.0)'));
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map((_, i) => i),
            datasets: [{
                data: data, borderColor: color, backgroundColor: bg,
                borderWidth: isTable ? 1.5 : 2, pointRadius: 0, fill: !isTable, tension: 0.2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false, min: Math.min(...data)*0.95, max: Math.max(...data)*1.05 } },
            layout: { padding: { top: 5, bottom: 5, left: 2, right: 2 } },
            interaction: { mode: 'none' }
        }
    });
}

// Detail View
function goHome() {
    lastView = 'dashboard';
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('portfolio-view').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'block';
    currentDetailCoinId = null;
}

function openDetail(coinId) {
    const coin = coinsData.find(c => c.id === coinId);
    if (!coin) return;
    
    currentDetailCoinId = coinId;
    
    document.getElementById('dashboard-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';
    document.getElementById('portfolio-view').style.display = 'none';
    window.scrollTo(0, 0);
    
    if (lastView === 'portfolio') {
        document.getElementById('breadcrumb-portfolio').style.display = 'inline';
        document.getElementById('breadcrumb-dashboard').style.display = 'none';
        document.getElementById('breadcrumb-separator').style.display = 'inline';
    } else {
        document.getElementById('breadcrumb-portfolio').style.display = 'none';
        document.getElementById('breadcrumb-dashboard').style.display = 'inline';
        document.getElementById('breadcrumb-separator').style.display = 'inline';
    }

    document.getElementById('detail-breadcrumb').textContent = `${coin.name} Fiyatı`;
    document.getElementById('detail-name').innerHTML = `${coin.name} <span style="background: #1f2937; font-size: 0.8rem; padding: 2px 6px; border-radius: 4px; color: var(--text-muted);">#${coin.market_cap_rank || '?'}</span>`;
    document.getElementById('detail-symbol').textContent = `${coin.symbol.toUpperCase()} Fiyatı`;
    
    document.getElementById('detail-icon').src = coin.image;
    
    document.getElementById('detail-price').textContent = formatCurrency(coin.current_price);
    
    const changeStr = coin.price_change_percentage_24h ? coin.price_change_percentage_24h.toFixed(2) + '%' : '0.00%';
    const changeEl = document.getElementById('detail-change');
    changeEl.textContent = `${coin.price_change_percentage_24h >= 0 ? '▲' : '▼'} ${changeStr} (24s)`;
    changeEl.className = `price-change ${coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}`;

    document.getElementById('stat-mcap').textContent = formatCurrency(coin.market_cap);
    document.getElementById('stat-vol').textContent = formatCurrency(coin.total_volume);
    document.getElementById('stat-circ').textContent = formatNumber(coin.circulating_supply);
    document.getElementById('stat-total').textContent = formatNumber(coin.total_supply);

    switchTab('overview');
    
    if(typeof switchPanelTab === 'function') {
        switchPanelTab('demo');
        setTradeTab('buy');
    }
    
    // Initial chart load (7 days)
    fetchDetailChart('7');
}

let currentChartType = 'line';
let currentChartDays = '7';
let candleChartInstance = null;

function setChartType(type) {
    currentChartType = type;
    
    // Update button states
    document.getElementById('btn-type-line').classList.remove('active');
    document.getElementById('btn-type-candle').classList.remove('active');
    document.getElementById(`btn-type-${type}`).classList.add('active');

    // Toggle canvas / div visibility
    if (type === 'line') {
        document.getElementById('detail-main-chart').style.display = 'block';
        document.getElementById('candle-chart').style.display = 'none';
    } else {
        document.getElementById('detail-main-chart').style.display = 'none';
        document.getElementById('candle-chart').style.display = 'block';
    }
    
    fetchDetailChart(currentChartDays);
}

async function fetchDetailChart(days) {
    if (!currentDetailCoinId) return;
    
    // Yalnızca zaman butonlarına tıklandıysa active sınıfını güncelle
    if (event && event.target && event.target.parentElement && event.target.parentElement.id === 'chart-time-filters') {
        document.querySelectorAll('#chart-time-filters .time-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
    }
    
    currentChartDays = days;
    document.getElementById('chart-loading').style.display = 'block';

    try {
        if (currentChartType === 'line') {
            const res = await fetch(`https://api.coingecko.com/api/v3/coins/${currentDetailCoinId}/market_chart?vs_currency=usd&days=${days}`);
            const json = await res.json();
            renderBigChart(json.prices, currentDetailCoinId);
        } else {
            const res = await fetch(`https://api.coingecko.com/api/v3/coins/${currentDetailCoinId}/ohlc?vs_currency=usd&days=${days}`);
            const ohlcData = await res.json();
            renderCandleChart(ohlcData, currentDetailCoinId);
        }
    } catch (e) {
        console.error(e);
    } finally {
        document.getElementById('chart-loading').style.display = 'none';
    }
}

function renderCandleChart(ohlcData, coinId) {
    if (candleChartInstance) {
        candleChartInstance.destroy();
    }
    
    const formattedData = ohlcData.map(item => {
        return {
            x: new Date(item[0]),
            y: [item[1], item[2], item[3], item[4]]
        }
    });
    
    const options = {
        series: [{ data: formattedData }],
        chart: {
            type: 'candlestick',
            height: 450,
            background: 'transparent',
            toolbar: { show: false }
        },
        theme: { mode: 'dark' },
        plotOptions: {
            candlestick: {
                colors: {
                    upward: '#22c55e',
                    downward: '#ef4444'
                }
            }
        },
        xaxis: { type: 'datetime' },
        yaxis: { tooltip: { enabled: true } }
    };

    candleChartInstance = new ApexCharts(document.querySelector("#candle-chart"), options);
    candleChartInstance.render();
}

function renderBigChart(pricesArray, coinId) {
    const coin = coinsData.find(c => c.id === coinId);
    const lineColor = (coin && coin.price_change_percentage_24h >= 0) ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)';
    
    const ctx = document.getElementById('detail-main-chart').getContext('2d');
    
    if (detailChartInstance) {
        detailChartInstance.destroy();
    }

    const dataPoints = pricesArray.map(p => p[1]);
    const labels = pricesArray.map(p => {
        const d = new Date(p[0]);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    });

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, lineColor.replace('1)', '0.2)'));
    gradient.addColorStop(1, lineColor.replace('1)', '0.0)'));

    detailChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: dataPoints,
                borderColor: lineColor,
                backgroundColor: gradient,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#1f2937',
                    titleColor: '#fff',
                    bodyColor: lineColor,
                    borderColor: lineColor,
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: { display: false },
                y: { 
                    position: 'right',
                    grid: { color: '#1f2937', drawBorder: false },
                    ticks: { color: '#94a3b8' }
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });
}

// Tab Logic
function switchTab(tabId) {
    // UI Update
    document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    
    // Content Update
    document.getElementById('content-overview').style.display = 'none';
    document.getElementById('content-markets').style.display = 'none';
    
    document.getElementById('content-' + tabId).style.display = 'block';
    
    // Fetch data if needed
    if (tabId === 'markets') {
        fetchMarketsData();
    }
}

async function fetchMarketsData() {
    const tbody = document.getElementById('markets-table-body');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">Piyasa verileri yükleniyor...</td></tr>';
    
    if (!currentDetailCoinId) return;
    
    try {
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/${currentDetailCoinId}/tickers`);
        const json = await res.json();
        
        const tickers = json.tickers.slice(0, 10); // Top 10 exchanges
        
        tbody.innerHTML = '';
        tickers.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 600;">${t.market.name}</td>
                <td><span class="coin-symbol">${t.base}/${t.target}</span></td>
                <td>${formatCurrency(t.converted_last.usd)}</td>
                <td>${formatCurrency(t.converted_volume.usd)}</td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--danger);">Veri yüklenemedi. (Rate Limit)</td></tr>';
    }
}

// --- PORTFOLIO SYSTEM ---

const API_BASE_URL = "https://po80ugrsea.execute-api.us-east-1.amazonaws.com/Prod"; 

let loggedInUser = localStorage.getItem('m2m_user') || null;

function updateNav() {
    const authBtn = document.getElementById('auth-btn');
    const portBtn = document.getElementById('portfolio-btn');
    const outBtn = document.getElementById('logout-btn');
    const greet = document.getElementById('user-greeting');
    if (!authBtn) return;
    if (loggedInUser) {
        authBtn.style.display = 'none';
        portBtn.style.display = 'inline-block';
        outBtn.style.display = 'inline-block';
        greet.style.display = 'inline-block';
        greet.textContent = 'Merhaba, ' + loggedInUser;
    } else {
        authBtn.style.display = 'inline-block';
        portBtn.style.display = 'none';
        outBtn.style.display = 'none';
        greet.style.display = 'none';
    }
}
setTimeout(updateNav, 100);

function getUserId() {
    return loggedInUser;
}

function checkAuth() {
    if (!loggedInUser) {
        document.getElementById('auth-modal').style.display = 'flex';
        return false;
    }
    return true;
}

function logout() {
    const overlay = document.getElementById('logout-overlay');
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    
    document.querySelectorAll('.coin-rain').forEach(el => el.remove());
    const symbols = ['₿', 'Ξ', '🐕', '✕', '₳', 'SOL', 'PEPE', 'MATIC', 'AVAX', 'DOT', 'LINK', 'BNB', 'USDT', 'SHIB', 'TRX'];
    for (let i = 0; i < 35; i++) {
        const drop = document.createElement('div');
        drop.className = 'coin-rain';
        drop.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        drop.style.left = Math.random() * 100 + 'vw';
        drop.style.animationDuration = (Math.random() * 2 + 2) + 's';
        drop.style.animationDelay = (Math.random() * 0.5) + 's';
        drop.style.fontSize = (Math.random() * 1.5 + 1) + 'rem';
        overlay.appendChild(drop);
    }
    
    setTimeout(() => {
        loggedInUser = null;
        localStorage.removeItem('m2m_user');
        updateNav();
        goHome();
        
        overlay.style.transition = 'opacity 0.5s ease';
        overlay.style.opacity = '0';
        
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500);
    }, 3000);
}

async function submitAuth(action) {
    const user = document.getElementById('auth-username').value;
    const pass = document.getElementById('auth-password').value;
    
    if(!user || !pass) {
        alert("Lütfen kullanıcı adı ve şifre girin.");
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE_URL}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action, username: user, password: pass })
        });
        const data = await res.json();
        
        if (res.ok) {
            document.getElementById('auth-modal').style.display = 'none';
            const overlay = document.getElementById('login-overlay');
            overlay.style.display = 'flex';
            overlay.style.opacity = '1';

            document.querySelectorAll('.binary-rain').forEach(el => el.remove());
            const symbols = ['₿', 'Ξ', '🐕', '✕', '₳', 'SOL', 'PEPE', 'MATIC', 'AVAX', 'DOT', 'LINK', 'BNB', 'USDT', 'SHIB', 'TRX'];
            for (let i = 0; i < 40; i++) {
                const drop = document.createElement('div');
                drop.className = 'binary-rain';
                drop.textContent = symbols[Math.floor(Math.random() * symbols.length)];
                drop.style.left = Math.random() * 100 + 'vw';
                drop.style.animationDuration = (Math.random() * 2 + 2) + 's';
                drop.style.animationDelay = (Math.random() * 0.5) + 's';
                drop.style.fontSize = (Math.random() * 1.5 + 1) + 'rem';
                overlay.appendChild(drop);
            }
            
            setTimeout(() => {
                loggedInUser = data.username;
                localStorage.setItem('m2m_user', loggedInUser);
                updateNav();
                
                overlay.style.transition = 'opacity 0.5s ease';
                overlay.style.opacity = '0';
                
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 500);
            }, 2500);
        } else {
            alert(data.error || "Bir hata oluştu.");
        }
    } catch (e) {
        alert("Bağlantı hatası!");
        console.error(e);
    }
}

function openAuthModal() {
    document.getElementById('auth-modal').style.display = 'flex';
}

function switchPanelTab(tab) {
    const demoTab = document.getElementById('panel-tab-demo');
    const realTab = document.getElementById('panel-tab-real');
    
    if (tab === 'demo') {
        demoTab.style.background = 'var(--surface-color)';
        demoTab.style.color = 'var(--text-main)';
        demoTab.style.border = '2px solid var(--accent)';
        
        realTab.style.background = 'transparent';
        realTab.style.color = 'var(--text-muted)';
        realTab.style.border = '2px solid transparent';
        
        document.getElementById('panel-content-demo').style.display = 'block';
        document.getElementById('panel-content-real').style.display = 'none';
    } else {
        demoTab.style.background = 'transparent';
        demoTab.style.color = 'var(--text-muted)';
        demoTab.style.border = '2px solid transparent';
        
        realTab.style.background = 'var(--surface-color)';
        realTab.style.color = 'var(--text-main)';
        realTab.style.border = '2px solid var(--accent)';
        
        document.getElementById('panel-content-demo').style.display = 'none';
        document.getElementById('panel-content-real').style.display = 'block';
        
        updateRealPanel();
    }
}

let currentTradeMode = 'buy';

function setTradeTab(mode) {
    currentTradeMode = mode;
    const buyBtn = document.getElementById('trade-tab-buy');
    const sellBtn = document.getElementById('trade-tab-sell');
    
    buyBtn.classList.remove('active');
    sellBtn.classList.remove('active');
    
    buyBtn.style.color = 'var(--text-muted)';
    buyBtn.style.border = '1px solid transparent';
    sellBtn.style.color = 'var(--text-muted)';
    sellBtn.style.border = '1px solid transparent';
    
    if (mode === 'buy') {
        buyBtn.classList.add('active');
        buyBtn.style.color = 'var(--accent)';
        buyBtn.style.border = '1px solid var(--text-main)';
    } else {
        sellBtn.classList.add('active');
        sellBtn.style.color = 'var(--danger)';
        sellBtn.style.border = '1px solid var(--text-main)';
    }
    
    document.getElementById('trade-action-btn').textContent = mode === 'buy' ? 'Satın Al' : 'Sat';
    document.getElementById('trade-action-btn').style.background = mode === 'buy' ? 'var(--accent)' : 'var(--danger)';
    
    document.getElementById('trade-input-usd').value = '';
    document.getElementById('trade-input-coin').value = '';
}

let currentRealMode = 'add';

function setRealTab(mode) {
    currentRealMode = mode;
    const addBtn = document.getElementById('real-tab-add');
    const removeBtn = document.getElementById('real-tab-remove');
    const actionBtn = document.getElementById('real-action-btn');
    
    addBtn.classList.remove('active');
    removeBtn.classList.remove('active');
    
    addBtn.style.color = 'var(--text-muted)';
    addBtn.style.border = '1px solid transparent';
    removeBtn.style.color = 'var(--text-muted)';
    removeBtn.style.border = '1px solid transparent';
    
    if (mode === 'add') {
        addBtn.classList.add('active');
        addBtn.style.color = 'var(--accent)';
        addBtn.style.border = '1px solid var(--text-main)';
        
        actionBtn.textContent = 'Portföye Ekle';
        actionBtn.style.background = 'var(--accent)';
        actionBtn.style.color = '#000';
    } else {
        removeBtn.classList.add('active');
        removeBtn.style.color = 'var(--danger)';
        removeBtn.style.border = '1px solid var(--text-main)';
        
        actionBtn.textContent = 'Portföyden Sil';
        actionBtn.style.background = 'var(--danger)';
        actionBtn.style.color = '#000';
    }
    
    
    document.getElementById('real-input-usd').value = '';
            document.getElementById('real-input-coin').value = '';
}

function getWallet() {
    if (!loggedInUser) return null;
    let walletStr = localStorage.getItem(`m2m_wallet_${loggedInUser}`);
    let wallet = null;
    if (walletStr) {
        try {
            wallet = JSON.parse(walletStr);
        } catch (e) {
            console.error("Corrupted wallet JSON, resetting:", e);
        }
    }
    if (!wallet || typeof wallet !== 'object' || typeof wallet.usd_balance === 'undefined') {
        wallet = { usd_balance: 100000, holdings: {} };
        saveWallet(wallet);
    }
    return wallet;
}

function saveWallet(wallet) {
    if (!loggedInUser) return;
    localStorage.setItem(`m2m_wallet_${loggedInUser}`, JSON.stringify(wallet));
}


function handleTradeInput(source) {
    const coin = coinsData.find(c => c.id === currentDetailCoinId);
    if (!coin) return;
    const price = coin.current_price;
    const usdInput = document.getElementById('trade-input-usd');
    const coinInput = document.getElementById('trade-input-coin');

    if (source === 'usd') {
        const usdVal = parseFloat(usdInput.value);
        if (!isNaN(usdVal) && usdVal > 0) {
            coinInput.value = (usdVal / price).toFixed(6);
        } else {
            coinInput.value = '';
        }
    } else if (source === 'coin') {
        const coinVal = parseFloat(coinInput.value);
        if (!isNaN(coinVal) && coinVal > 0) {
            usdInput.value = (coinVal * price).toFixed(2);
        } else {
            usdInput.value = '';
        }
    }
}

function executeTrade() {
    if (!checkAuth()) return;
    const coin = coinsData.find(c => c.id === currentDetailCoinId);
    if (!coin) return;
    const currentPrice = coin.current_price;
    const usdVal = parseFloat(document.getElementById('trade-input-usd').value);
    const coinVal = parseFloat(document.getElementById('trade-input-coin').value);
    
    if (isNaN(usdVal) || usdVal <= 0 || isNaN(coinVal) || coinVal <= 0) {
        alert("Lütfen geçerli bir miktar girin.");
        return;
    }
    
    let wallet = getWallet();
    if (!wallet) return;

    if (currentTradeMode === 'buy') {
        if (wallet.usd_balance < usdVal) {
            alert("Yetersiz bakiye!");
            return;
        }
        wallet.usd_balance -= usdVal;
        
        if (!wallet.holdings[coin.id]) {
            wallet.holdings[coin.id] = { amount: 0, avg_price: 0 };
        }
        
        const hold = wallet.holdings[coin.id];
        const totalCostBefore = hold.amount * hold.avg_price;
        hold.amount += coinVal;
        hold.avg_price = (totalCostBefore + usdVal) / hold.amount;
        
        saveWallet(wallet);
        alert(`İşlem Başarılı! ${formatCurrency(usdVal)} karşılığında ${coinVal.toFixed(6)} ${coin.symbol.toUpperCase()} alındı.`);
    } else {
        const hold = wallet.holdings[coin.id];
        if (!hold || hold.amount < coinVal) {
            alert("Yetersiz coin bakiyesi!");
            return;
        }
        
        hold.amount -= coinVal;
        if (hold.amount <= 0) {
            delete wallet.holdings[coin.id];
        }
        
        wallet.usd_balance += usdVal;
        saveWallet(wallet);
        alert(`İşlem Başarılı! ${coinVal} ${coin.symbol.toUpperCase()} satıldı ve ${formatCurrency(usdVal)} hesabınıza eklendi.`);
    }
    
    document.getElementById('trade-input-usd').value = '';
    document.getElementById('trade-input-coin').value = '';
    document.getElementById('trade-usd-balance').textContent = formatCurrency(wallet.usd_balance);
    const coinBal = wallet.holdings[coin.id] ? wallet.holdings[coin.id].amount : 0;
    document.getElementById('trade-coin-balance').textContent = coinBal.toFixed(4);
}

async function updateRealPanel() {
    if (!checkAuth()) return;
    try {
        const res = await fetch(`${API_BASE_URL}/portfolio?userId=${getUserId()}`);
        if(res.ok) {
            const data = await res.json();
            const assets = data.assets || {};
            let bal = 0;
            if(currentDetailCoinId && assets[currentDetailCoinId]) {
                bal = assets[currentDetailCoinId];
            }
            document.getElementById('real-coin-balance').textContent = bal.toString();
        }
    } catch(e) {}
}


function handleRealInput(source) {
    const coin = coinsData.find(c => c.id === currentDetailCoinId);
    if (!coin) return;
    const price = coin.current_price;
    const usdInput = document.getElementById('real-input-usd');
    const coinInput = document.getElementById('real-input-coin');

    if (source === 'usd') {
        const usdVal = parseFloat(usdInput.value);
        if (!isNaN(usdVal) && usdVal > 0) {
            coinInput.value = (usdVal / price).toFixed(6);
        } else {
            coinInput.value = '';
        }
    } else if (source === 'coin') {
        const coinVal = parseFloat(coinInput.value);
        if (!isNaN(coinVal) && coinVal > 0) {
            usdInput.value = (coinVal * price).toFixed(2);
        } else {
            usdInput.value = '';
        }
    }
}

async function executeReal() {
    if (!checkAuth()) return;
    const coin = coinsData.find(c => c.id === currentDetailCoinId);
    if (!coin) return;
    
    const coinVal = parseFloat(document.getElementById('real-input-coin').value);
    
    if (isNaN(coinVal) || coinVal <= 0) {
        alert("Lütfen geçerli bir miktar girin.");
        return;
    }
    
    const currentBal = parseFloat(document.getElementById('real-coin-balance').textContent) || 0;
    let newBalance = currentBal;
    
    if (currentRealMode === 'add') {
        newBalance += coinVal;
    } else {
        if (currentBal < coinVal) {
            alert("Gerçek portföyünüzde bu kadar coin yok!");
            return;
        }
        newBalance -= coinVal;
    }
    
    try {
        const res = await fetch(`${API_BASE_URL}/portfolio`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                userId: getUserId(),
                coinId: coin.id,
                amount: newBalance
            })
        });
        if(res.ok) {
            alert(`Portföyünüz başarıyla güncellendi! Yeni bakiye: ${newBalance} ${coin.symbol.toUpperCase()}`);
            document.getElementById('real-coin-balance').textContent = newBalance.toString();
            
            document.getElementById('real-input-usd').value = '';
            document.getElementById('real-input-coin').value = '';
        } else {
            alert("Hata oluştu. API linkini güncellediğinizden emin olun.");
        }
    } catch(e) {
        alert("Bağlantı hatası: API Linkini (API_BASE_URL) ayarladınız mı?");
    }
}

function switchPortTab(tab) {
    const demoTab = document.getElementById('port-tab-demo');
    const realTab = document.getElementById('port-tab-real');
    
    if (tab === 'demo') {
        demoTab.style.background = 'var(--surface-color)';
        demoTab.style.color = 'var(--text-main)';
        demoTab.style.border = '2px solid var(--accent)';
        
        realTab.style.background = 'transparent';
        realTab.style.color = 'var(--text-muted)';
        realTab.style.border = '2px solid transparent';
        
        document.getElementById('port-content-demo').style.display = 'block';
        document.getElementById('port-content-real').style.display = 'none';
    } else {
        demoTab.style.background = 'transparent';
        demoTab.style.color = 'var(--text-muted)';
        demoTab.style.border = '2px solid transparent';
        
        realTab.style.background = 'var(--surface-color)';
        realTab.style.color = 'var(--text-main)';
        realTab.style.border = '2px solid var(--accent)';
        
        document.getElementById('port-content-demo').style.display = 'none';
        document.getElementById('port-content-real').style.display = 'block';
    }
}



async function openPortfolio() {
    if (!checkAuth()) return;
    
    lastView = 'portfolio';
    
    document.getElementById('dashboard-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('portfolio-view').style.display = 'block';
    
    switchPortTab('demo'); 
    
    const demoTbody = document.getElementById('demo-table-body');
    const demoTbodyActual = document.getElementById('demo-table-body') || document.getElementById('demo-table');
    const targetDemoTbody = demoTbodyActual ? demoTbodyActual : demoTbody;
    const wallet = getWallet();
    
    if(document.getElementById('demo-cash-balance')) document.getElementById('demo-cash-balance').textContent = formatCurrency(wallet.usd_balance);
    
    const assetKeys = Object.keys(wallet.holdings);
    if (assetKeys.length === 0) {
        if(targetDemoTbody) targetDemoTbody.innerHTML = '<tr><td colspan="7" onclick="" style="text-align:center; color: var(--text-muted);">Demo cüzdanınız boş. Detay sayfasından coin satın alın.</td></tr>';
        if(document.getElementById('demo-total-balance')) document.getElementById('demo-total-balance').textContent = formatCurrency(wallet.usd_balance);
    } else {
        let totalHoldingsValue = 0;
        if(targetDemoTbody) targetDemoTbody.innerHTML = '';
        for (const coinId of assetKeys) {
            const hold = wallet.holdings[coinId];
            const coinData = coinsData.find(c => c.id === coinId);
            const currentPrice = coinData ? coinData.current_price : 0; 
            const symbol = coinData ? coinData.symbol.toUpperCase() : coinId.toUpperCase();
            
            const value = hold.amount * currentPrice;
            totalHoldingsValue += value;
            
            const costValue = hold.amount * hold.avg_price;
            const pnl = value - costValue;
            const pnlPercent = costValue > 0 ? (pnl / costValue) * 100 : 0;
            const pnlClass = pnl >= 0 ? 'positive' : 'negative';
            const pnlSign = pnl >= 0 ? '+' : '';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 600; text-transform: capitalize; cursor: pointer;" onclick="openDetail('${coinId}')">
                    ${coinId} <span style="font-size: 0.8rem; color: var(--text-muted);">(${symbol})</span>
                </td>
                <td>${hold.amount.toFixed(4)}</td>
                <td>${formatCurrency(hold.avg_price)}</td>
                <td>${formatCurrency(currentPrice)}</td>
                <td class="price-change ${pnlClass}">${pnlSign}${formatCurrency(pnl)} (${pnlSign}${pnlPercent.toFixed(2)}%)</td>
                <td style="color: var(--accent); font-weight: bold;">${formatCurrency(value)}</td>
                `;
            if(targetDemoTbody) targetDemoTbody.appendChild(tr);
        }
        if(document.getElementById('demo-total-balance')) document.getElementById('demo-total-balance').textContent = formatCurrency(wallet.usd_balance + totalHoldingsValue);
    }
    
    const realTbody = document.getElementById('portfolio-table-body');
    if(realTbody) realTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">Portföy yükleniyor...</td></tr>';
    if(document.getElementById('portfolio-total-balance')) document.getElementById('portfolio-total-balance').textContent = "Hesaplanıyor...";
    
    try {
        const res = await fetch(`${API_BASE_URL}/portfolio?userId=${getUserId()}`);
        if (!res.ok) throw new Error("API Error");
        const data = await res.json();
        
        const assets = data.assets || {};
        const realAssetKeys = Object.keys(assets);
        
        if (realAssetKeys.length === 0) {
            if(realTbody) realTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">Gerçek portföyünüz boş. Detay sayfasından coin ekleyin.</td></tr>';
            if(document.getElementById('portfolio-total-balance')) document.getElementById('portfolio-total-balance').textContent = "$0.00";
            return;
        }
        
        let totalRealUsd = 0;
        if(realTbody) realTbody.innerHTML = '';
        
        for (const coinId of realAssetKeys) {
            const amount = assets[coinId];
            const coinData = coinsData.find(c => c.id === coinId);
            const price = coinData ? coinData.current_price : 0; 
            const value = amount * price;
            totalRealUsd += value;
            const symbol = coinData ? coinData.symbol.toUpperCase() : coinId.toUpperCase();
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 600; text-transform: capitalize; cursor: pointer;" onclick="openDetail('${coinId}')">
                    ${coinId} <span style="font-size: 0.8rem; color: var(--text-muted);">(${symbol})</span>
                </td>
                <td>${amount.toFixed(4)}</td>
                <td>${formatCurrency(price)}</td>
                <td style="color: var(--accent); font-weight: bold;">${formatCurrency(value)}</td>
            `;
            if(realTbody) realTbody.appendChild(tr);
        }
        
        if(document.getElementById('portfolio-total-balance')) document.getElementById('portfolio-total-balance').textContent = formatCurrency(totalRealUsd);
        
    } catch (e) {
        console.error(e);
        if(realTbody) realTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--danger);">Bağlantı hatası. app.js dosyasındaki API_BASE_URL linkini güncellediniz mi?</td></tr>';
        if(document.getElementById('portfolio-total-balance')) document.getElementById('portfolio-total-balance').textContent = "$0.00";
    }
}
