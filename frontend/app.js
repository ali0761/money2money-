// App State
let coinsData = [];
let detailChartInstance = null;
let currentDetailCoinId = null;

const coinIds = "bitcoin,ethereum,solana,ripple,cardano,dogecoin,polkadot,matic-network,shiba-inu,chainlink,avalanche-2";

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
    } catch (e) {
        console.error(e);
        document.getElementById('top-cards-container').innerHTML = '<div style="color:var(--danger)">Veri yüklenemedi. Çok fazla istek atılmış olabilir (Rate limit). Biraz bekleyip sayfayı yenileyin.</div>';
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
        
        if (index < 4) {
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
function goBack() {
    document.getElementById('detail-view').style.display = 'none';
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
