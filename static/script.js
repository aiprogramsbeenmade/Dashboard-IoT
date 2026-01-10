console.log("Script.js caricato correttamente!");

let currentCity = "Anagni";
let consumptionChart = null;

// --- 1. GESTIONE MODAL QR ---
window.toggleQR = () => {
    const modal = document.getElementById('qr-modal');
    if (modal) modal.classList.toggle('hidden');
};

async function initWiFiQR() {
    const mini = document.getElementById("qrcode-mini");
    const big = document.getElementById("qrcode-big");
    if (!mini || !big) return;
    try {
        const response = await fetch('/api/wifi-info');
        const data = await response.json();
        const qrContent = `WIFI:S:${data.ssid};T:${data.encryption};P:${data.password};;`;
        if (document.getElementById('display-ssid')) document.getElementById('display-ssid').innerText = data.ssid;
        mini.innerHTML = ""; big.innerHTML = "";
        new QRCode(mini, { text: qrContent, width: 60, height: 60 });
        new QRCode(big, { text: qrContent, width: 250, height: 250 });
    } catch (err) { console.error("Errore QR:", err); }
}

// --- 2. GESTIONE SHELLY (FUNZIONI MANCANTI) ---
window.toggleLight = async () => {
    try {
        const response = await fetch('/api/shelly/toggle');
        const data = await response.json();
        if (data.status === "success") updateDashboard();
    } catch (error) { console.error("Errore Shelly Toggle:", error); }
};

window.openShellyDetails = (event) => {
    if (event.target.tagName === 'BUTTON') return;
    const modal = document.getElementById('shelly-modal');
    if (modal) {
        modal.classList.remove('hidden');
        initChart();
    }
};

window.closeModal = () => {
    const modal = document.getElementById('shelly-modal');
    if (modal) modal.classList.add('hidden');
};

async function initChart() {
    const ctx = document.getElementById('consumptionChart');
    if (!ctx) return;
    const response = await fetch('/api/shelly/history');
    const dbData = await response.json();
    if (consumptionChart) consumptionChart.destroy();
    consumptionChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: dbData.labels,
            datasets: [{
                label: 'Watt',
                data: dbData.values,
                borderColor: '#3b82f6',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(59, 130, 246, 0.1)'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// --- 3. AGGIORNAMENTO DATI ---
async function fetchModule(url, updateFn) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data) updateFn(data);
        return true;
    } catch (error) {
        console.error(`Errore su ${url}:`, error);
        return false;
    }
}

async function updateDashboard() {
    console.log("Aggiornamento dati dashboard...");
    const statusDot = document.getElementById('status-dot');

    const results = await Promise.all([
        // Meteo
        fetch(`/api/weather?city=${currentCity}`).then(r => r.json()).then(data => {
            document.getElementById('temp').innerText = (data.temp || "--") + "°C";
            document.getElementById('wind').innerText = data.wind || "--";
            document.getElementById('city-display').innerText = data.city || currentCity;
            return true;
        }).catch(() => false),

        // Crypto (CON FIX PER IL PREZZO)
        fetchModule('/api/crypto', (data) => {
            if (data && data.price) {
                document.getElementById('crypto-price').innerText = data.price.toLocaleString() + " €";
                const changeEl = document.getElementById('crypto-change');
                changeEl.innerText = (data.change_24h > 0 ? "+" : "") + data.change_24h + "%";
                changeEl.className = data.change_24h >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold";
            }
        }),

        // Shelly
        fetchModule('/api/shelly', (data) => {
            document.getElementById('shelly-status').innerText = data.label || "--";
            document.getElementById('shelly-power').innerText = (data.power || "0") + " W";
            const card = document.getElementById('shelly-card');
            if (card) card.style.borderLeftColor = data.ison ? "#10b981" : "#64748b";
        }),

        // Sistema
        fetchModule('/api/system', (data) => {
            document.getElementById('cpu-val').innerText = (data.cpu || "0") + "%";
            document.getElementById('cpu-bar').style.width = (data.cpu || "0") + "%";
            document.getElementById('ram-val').innerText = `${data.ram_used || "0"} / ${data.ram_total || "0"} GB`;
        }),

        // AQI
        fetchModule('/api/aqi', (data) => {
            const val = document.getElementById('aqi-val');
            if (val && data.aqi) {
                val.innerText = data.aqi;
                val.className = `text-4xl font-bold mt-2 ${data.color}`;
                document.getElementById('aqi-label').innerText = data.label;
            }
        }),

        // Ping
        fetchModule('/api/ping', (data) => {
            const val = document.getElementById('ping-val');
            if (val && data.ms !== undefined) {
                val.innerText = Math.round(data.ms);
                val.style.color = data.ms < 50 ? "#22d3ee" : data.ms < 100 ? "#facc15" : "#ef4444";
            }
        })
    ]);

    if (results.includes(true) && statusDot) {
        statusDot.innerHTML = `<span class="relative flex h-3 w-3 mr-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>Sistema Online`;
    }
}

// --- 4. OROLOGIO E AVVIO ---
function updateClock() {
    const now = new Date();
    const t = document.getElementById('clock-time');
    const d = document.getElementById('clock-date');
    if (t) t.innerText = now.toLocaleTimeString('it-IT');
    if (d) d.innerText = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}

document.addEventListener('DOMContentLoaded', () => {
    const qrCard = document.getElementById('qr-card');
    if (qrCard) qrCard.addEventListener('click', window.toggleQR);

    initWiFiQR();
    updateClock();
    updateDashboard();

    setInterval(updateClock, 1000);
    setInterval(updateDashboard, 30000);
});