console.log("Script.js caricato correttamente!");

let currentCity = "Anagni";
let consumptionChart = null;

// --- 1. GESTIONE MODAL QR ---
const toggleQR = () => {
    const modal = document.getElementById('qr-modal');
    if (modal) {
        modal.classList.toggle('hidden');
        console.log("Modal switch eseguito");
    }
};
window.toggleQR = toggleQR;

async function initWiFiQR() {
    const mini = document.getElementById("qrcode-mini");
    const big = document.getElementById("qrcode-big");
    if (!mini || !big) return;
    try {
        const response = await fetch('/api/wifi-info');
        const data = await response.json();
        const qrContent = `WIFI:S:${data.ssid};T:${data.encryption};P:${data.password};;`;
        if (document.getElementById('display-ssid')) {
            document.getElementById('display-ssid').innerText = data.ssid;
        }
        mini.innerHTML = ""; big.innerHTML = ""; // Pulisce prima di rigenerare
        new QRCode(mini, { text: qrContent, width: 60, height: 60 });
        new QRCode(big, { text: qrContent, width: 250, height: 250 });
        console.log("QR generati con successo");
    } catch (err) { console.error("Errore QR:", err); }
}

// --- 2. FUNZIONI DI AGGIORNAMENTO DATI ---
async function fetchModule(url, updateFn) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        updateFn(data);
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
            document.getElementById('temp').innerText = data.temp + "°C";
            document.getElementById('wind').innerText = data.wind;
            document.getElementById('city-display').innerText = data.city;
            return true;
        }).catch(() => false),

        // Crypto
        fetchModule('/api/crypto', (data) => {
            document.getElementById('crypto-price').innerText = data.price.toLocaleString() + " €";
            const changeEl = document.getElementById('crypto-change');
            changeEl.innerText = (data.change_24h > 0 ? "+" : "") + data.change_24h + "%";
            changeEl.className = data.change_24h >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold";
        }),

        // Shelly
        fetchModule('/api/shelly', (data) => {
            document.getElementById('shelly-status').innerText = data.label;
            document.getElementById('shelly-power').innerText = data.power + " W";
            const card = document.getElementById('shelly-card');
            if (card) card.style.borderLeftColor = data.ison ? "#10b981" : "#64748b";
        }),

        // Sistema
        fetchModule('/api/system', (data) => {
            document.getElementById('cpu-val').innerText = data.cpu + "%";
            document.getElementById('cpu-bar').style.width = data.cpu + "%";
            document.getElementById('ram-val').innerText = `${data.ram_used} / ${data.ram_total} GB`;
        }),

        // Ping
        fetchModule('/api/ping', (data) => {
            const val = document.getElementById('ping-val');
            if (val) {
                val.innerText = Math.round(data.ms);
                val.style.color = data.ms < 50 ? "#22d3ee" : data.ms < 100 ? "#facc15" : "#ef4444";
            }
        }),

        // AQI
        fetchModule('/api/aqi', (data) => {
            const valEl = document.getElementById('aqi-val');
            const labelEl = document.getElementById('aqi-label');
            if (valEl) {
                valEl.innerText = data.aqi;
                valEl.className = `text-4xl font-bold mt-2 ${data.color}`;
            }
            if (labelEl) {
                labelEl.innerText = data.label;
            }
        }),
    ]);

    if (results.includes(true) && statusDot) {
        statusDot.innerHTML = `<span class="relative flex h-3 w-3 mr-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>Sistema Online`;
    }
}

// --- 3. OROLOGIO ---
function updateClock() {
    const now = new Date();
    const t = document.getElementById('clock-time');
    const d = document.getElementById('clock-date');
    if (t) t.innerText = now.toLocaleTimeString('it-IT');
    if (d) d.innerText = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}

// --- 4. AVVIO ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM pronto, avvio dashboard...");

    // Click events
    const card = document.getElementById('qr-card');
    const modal = document.getElementById('qr-modal');
    if (card) card.addEventListener('click', toggleQR);
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) toggleQR(); });

    // Initial load
    initWiFiQR();
    updateClock();
    updateDashboard();

    // Timers
    setInterval(updateClock, 1000);
    setInterval(updateDashboard, 30000);
});