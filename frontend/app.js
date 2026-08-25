const API_URL = "https://po80ugrsea.execute-api.us-east-1.amazonaws.com/Prod/data"; 
// Endpoint successfully connected to AWS Serverless API

let chartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    const coinSelect = document.getElementById('coinSelect');
    const refreshBtn = document.getElementById('refreshBtn');

    fetchData(coinSelect.value);

    refreshBtn.addEventListener('click', () => {
        fetchData(coinSelect.value);
    });

    coinSelect.addEventListener('change', (e) => {
        fetchData(e.target.value);
    });
});

async function fetchData(coin) {
    const statusMsg = document.getElementById('statusMessage');
    statusMsg.textContent = `Fetching ${coin} data...`;
    
    try {
        // Fallback mock data for local testing before AWS deployment
        if (API_URL === "YOUR_API_GATEWAY_URL_HERE") {
            statusMsg.innerHTML = "⚠️ API URL is not set. Showing mock data for preview.<br>Deploy to AWS and update API_URL in app.js.";
            renderMockData(coin);
            return;
        }

        const response = await fetch(`${API_URL}?coin=${coin}`);
        if (!response.ok) throw new Error("Failed to fetch data");
        
        const json = await response.json();
        
        if (json.data && json.data.length > 0) {
            renderChart(coin, json.data);
            statusMsg.textContent = "Data loaded successfully (Last 24h).";
        } else {
            statusMsg.textContent = "No data found for this coin yet.";
        }

    } catch (error) {
        console.error("Error:", error);
        statusMsg.textContent = "Error fetching data. Check console.";
    }
}

function renderChart(coin, dataItems) {
    const ctx = document.getElementById('cryptoChart').getContext('2d');
    
    // Ensure chronological order
    dataItems.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const labels = dataItems.map(item => {
        const date = new Date(item.timestamp);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    });
    
    const prices = dataItems.map(item => item.price_usd);

    if (chartInstance) {
        chartInstance.destroy();
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${coin.toUpperCase()} Price (USD)`,
                data: prices,
                borderColor: '#3b82f6',
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHitRadius: 20
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#f8fafc' }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                },
                y: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}

function renderMockData(coin) {
    const mockData = [];
    let basePrice = coin === 'bitcoin' ? 64000 : 3400;
    
    for(let i=0; i<24; i++) {
        mockData.push({
            timestamp: new Date(Date.now() - (24-i) * 3600000).toISOString(),
            price_usd: basePrice + (Math.random() * 1000 - 500)
        });
    }
    renderChart(coin, mockData);
}
