// App State
let coinsData = [];
let detailChartInstance = null;
let currentDetailCoinId = null;

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
    window.scrollTo(0, 0);

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
    // Initial chart load (7 days)
    fetchDetailChart('7');
}

async function fetchDetailChart(days) {
    if (!currentDetailCoinId) return;
    
    // Update button states
    document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
    event && event.target && event.target.classList.add('active');

    document.getElementById('chart-loading').style.display = 'block';

    try {
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/${currentDetailCoinId}/market_chart?vs_currency=usd&days=${days}`);
        const json = await res.json();
        
        renderBigChart(json.prices, currentDetailCoinId);
    } catch (e) {
        console.error(e);
    } finally {
        document.getElementById('chart-loading').style.display = 'none';
    }
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

// LUTFEN AWS GITHUB ACTIONS CIKTISINDAKI API LINKI ILE BURAYI GUNCELLEYIN
const API_BASE_URL = "https://po80ugrsea.execute-api.us-east-1.amazonaws.com/Prod"; 

let loggedInUser = localStorage.getItem('m2m_user') || null;

function updateNav() {
    const authBtn = document.getElementById('auth-btn');
    const portBtn = document.getElementById('portfolio-btn');
    const outBtn = document.getElementById('logout-btn');
    const greet = document.getElementById('user-greeting');
    if (!authBtn) return; // if DOM not ready
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
    
    // Matrix Yagmurunu Baslat
    document.querySelectorAll('.coin-rain').forEach(el => el.remove());
    const symbols = ['₿', 'Ξ', '🐕', '✕', '₳', '$', 'SOL', 'PEPE', '0', '1'];
    for (let i = 0; i < 30; i++) {
        const drop = document.createElement('div');
        drop.className = 'coin-rain';
        drop.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        drop.style.left = Math.random() * 100 + 'vw';
        drop.style.animationDuration = (Math.random() * 2 + 2) + 's';
        drop.style.animationDelay = (Math.random() * 0.5) + 's';
        drop.style.fontSize = (Math.random() * 1.5 + 1) + 'rem';
        overlay.appendChild(drop);
    }
    
    // Matrix bekleme süresi 3 saniyeye uzatıldı ki yavaşlayan yağmur izlenebilsin
    setTimeout(() => {
        loggedInUser = null;
        localStorage.removeItem('m2m_user');
        updateNav();
        goHome();
        
        // Karartarak çıkma (Fade out)
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
            loggedInUser = data.username;
            localStorage.setItem('m2m_user', loggedInUser);
            document.getElementById('auth-modal').style.display = 'none';
            updateNav();
            alert("İşlem başarılı!");
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

async function promptPortfolio() {
    if (!checkAuth()) return;
    if (!currentDetailCoinId) return;
    const amount = prompt(`Kaç adet ${currentDetailCoinId.toUpperCase()} varlığınız var? (Sıfırlamak için 0 yazın)`);
    if (amount === null || isNaN(amount) || amount === "") return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/portfolio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: getUserId(),
                coinId: currentDetailCoinId,
                amount: parseFloat(amount)
            })
        });
        if(res.ok) {
            alert("Portföyünüz başarıyla güncellendi!");
        } else {
            alert("Hata oluştu. API linkini güncellediğinizden emin olun.");
        }
    } catch(e) {
        alert("Bağlantı hatası: API Linkini (API_BASE_URL) ayarladınız mı?");
    }
}

async function openPortfolio() {
    document.getElementById('dashboard-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('portfolio-view').style.display = 'block';
    
    const tbody = document.getElementById('portfolio-table-body');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">Portföy yükleniyor...</td></tr>';
    document.getElementById('portfolio-total-balance').textContent = "Hesaplanıyor...";
    
    try {
        const res = await fetch(`${API_BASE_URL}/portfolio?userId=${getUserId()}`);
        if (!res.ok) throw new Error("API Error");
        const data = await res.json();
        
        const assets = data.assets || {};
        const assetKeys = Object.keys(assets);
        
        if (assetKeys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">Portföyünüz boş. Detay sayfasından coin ekleyin.</td></tr>';
            document.getElementById('portfolio-total-balance').textContent = "$0.00";
            return;
        }
        
        let totalUsd = 0;
        tbody.innerHTML = '';
        
        for (const coinId of assetKeys) {
            const amount = assets[coinId];
            const coinData = coinsData.find(c => c.id === coinId);
            const price = coinData ? coinData.current_price : 0; 
            const value = amount * price;
            totalUsd += value;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 600; text-transform: capitalize;">${coinId}</td>
                <td>${amount}</td>
                <td>${formatCurrency(price)}</td>
                <td style="color: var(--accent); font-weight: bold;">${formatCurrency(value)}</td>
            `;
            tbody.appendChild(tr);
        }
        
        document.getElementById('portfolio-total-balance').textContent = formatCurrency(totalUsd);
        
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--danger);">Bağlantı hatası. app.js dosyasındaki API_BASE_URL linkini güncellediniz mi?</td></tr>';
        document.getElementById('portfolio-total-balance').textContent = "$0.00";
    }
}
