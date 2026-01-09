let currentCity = "Anagni";

async function fetchModule(url, updateFn) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === "success") {
            updateFn(data);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Errore su ${url}:`, error);
        return false;
    }
}

// Nuova funzione per comandare la luce
async function toggleLight() {
    try {
        const response = await fetch('/api/shelly/toggle');
        const data = await response.json();

        if (data.status === "success") {
            // Aggiorna subito la dashboard per vedere il cambiamento
            updateDashboard();
        } else {
            alert("Errore nel comando Shelly: " + data.message);
        }
    } catch (error) {
        console.error("Errore nell'invio del comando:", error);
    }
}

let consumptionChart; // Variabile globale per il grafico

function openShellyDetails(event) {
    // Evita che il modal si apra se clicchi solo sul pulsante ON/OFF
    if (event.target.tagName === 'BUTTON') return;

    const modal = document.getElementById('shelly-modal');
    modal.classList.remove('hidden');

    initChart();
}

function closeModal() {
    document.getElementById('shelly-modal').classList.add('hidden');
}

async function initChart() {
    const ctx = document.getElementById('consumptionChart').getContext('2d');

    // Recuperiamo i dati reali dal database tramite Python
    const response = await fetch('/api/shelly/history');
    const dbData = await response.json();

    if (consumptionChart) consumptionChart.destroy();

    consumptionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dbData.labels, // Ore reali dal DB
            datasets: [{
                label: 'Consumo (Watt)',
                data: dbData.values, // Watt reali dal DB
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

// Funzione per caricare la nota all'avvio
async function loadNote() {
    const response = await fetch('/api/note');
    const data = await response.json();
    document.getElementById('note-input').value = data.note;
}

// Funzione per salvare la nota
let saveTimeout;
function debouncedSaveNote() {
    const status = document.getElementById('note-status');
    status.innerText = "Salvataggio...";

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        const noteText = document.getElementById('note-input').value;
        await fetch('/api/note', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note: noteText })
        });
        status.innerText = "Salvato!";
    }, 1000); // Salva dopo 1 secondo di inattività
}

// Chiama loadNote() all'avvio
loadNote();

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('it-IT', { hour12: false });
    const dateStr = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

    document.getElementById('clock-time').innerText = timeStr;
    document.getElementById('clock-date').innerText = dateStr;
}
setInterval(updateClock, 1000);
updateClock();

function toggleCityInput() {
    const display = document.getElementById('city-display');
    const input = document.getElementById('city-input');

    display.classList.toggle('hidden');
    input.classList.toggle('hidden');
    if (!input.classList.contains('hidden')) input.focus();
}

async function handleCityChange(event) {
    if (event.key === 'Enter') {
        const newCity = event.target.value.trim();
        if (newCity) {
            currentCity = newCity;
            document.getElementById('city-display').innerText = newCity;
            toggleCityInput();
            updateDashboard(); // Forza l'aggiornamento immediato
        }
    }
}

async function updateDashboard() {
    const statusDot = document.getElementById('status-dot');

    // Eseguiamo TUTTE le chiamate in parallelo
    const results = await Promise.all([
        // 1. Meteo
        fetch(`/api/weather?city=${currentCity}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === "success") {
                    document.getElementById('temp').innerText = data.temp + "°C";
                    document.getElementById('wind').innerText = data.wind;
                    document.getElementById('city-display').innerText = data.city;
                    return true; // <--- Aggiungi questo per il pallino di stato
                }
                return false;
            })
        .catch(err => console.error("Errore meteo:", err)),
        // 2. Crypto
        fetchModule('/api/crypto', (data) => {
            document.getElementById('crypto-price').innerText = data.price.toLocaleString() + " €";
            const changeEl = document.getElementById('crypto-change');
            changeEl.innerText = (data.change_24h > 0 ? "+" : "") + data.change_24h + "%";
            changeEl.className = data.change_24h >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold";
        }),
        // 3. Shelly
        fetchModule('/api/shelly', (data) => {
            document.getElementById('shelly-status').innerText = data.label;
            document.getElementById('shelly-power').innerText = data.power + " W";
            const shellyCard = document.getElementById('shelly-card');
            if (shellyCard) {
                if (data.ison) {
                    shellyCard.style.borderLeftColor = "#10b981"; // Emerald-500 (Acceso)
                } else {
                    shellyCard.style.borderLeftColor = "#64748b"; // Slate-500 (Spento)
                }
            }
        }),
        // 4. CPU
        fetchModule('/api/system', (data) => {
            document.getElementById('cpu-val').innerText = data.cpu + "%";
            document.getElementById('cpu-bar').style.width = data.cpu + "%";
            document.getElementById('ram-val').innerText = `${data.ram_used} / ${data.ram_total} GB`;

            // Cambia colore alla barra se la CPU scotta (> 80%)
            const cpuBar = document.getElementById('cpu-bar');
            if (data.cpu > 80) {
                cpuBar.classList.replace('bg-purple-500', 'bg-red-500');
            } else {
                cpuBar.classList.replace('bg-red-500', 'bg-purple-500');
            }
        }),
        // 5. AQI
        fetchModule('/api/aqi', (data) => {
            const valEl = document.getElementById('aqi-val');
            const labelEl = document.getElementById('aqi-label');

            valEl.innerText = data.aqi;
            valEl.className = `text-4xl font-bold mt-2 ${data.color}`; // Cambia colore al numero
            labelEl.innerText = data.label;
            labelEl.className = `px-2 py-1 rounded text-xs font-bold bg-slate-800 ${data.color}`;
        }),

        fetchModule('/api/ping', (data) => {
            const valEl = document.getElementById('ping-val');
            const labelEl = document.getElementById('ping-label');
            const indicator = document.getElementById('ping-indicator');

            valEl.innerText = Math.round(data.ms);
            labelEl.innerText = `Host: ${data.host}`;

            // Cambia colore in base alla latenza
            if (data.ms < 50) {
                valEl.className = "text-4xl font-bold mt-2 text-cyan-400";
                indicator.className = "h-2 w-2 rounded-full bg-cyan-400 mr-2 animate-pulse";
            } else if (data.ms < 100) {
                valEl.className = "text-4xl font-bold mt-2 text-yellow-400";
                indicator.className = "h-2 w-2 rounded-full bg-yellow-400 mr-2";
            } else {
                valEl.className = "text-4xl font-bold mt-2 text-red-500";
                indicator.className = "h-2 w-2 rounded-full bg-red-500 mr-2";
            }
        })
    ]);

    // Gestione pallino di stato
    if (results.includes(true)) {
        statusDot.innerHTML = `
            <span class="relative flex h-3 w-3 mr-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            Sistema Online`;
        statusDot.className = "flex items-center text-sm text-emerald-400";
    } else {
        statusDot.innerText = "⚠️ Problemi di connessione";
        statusDot.className = "flex items-center text-sm text-red-400";
    }
}

// Sostituisci la parte finale del tuo script.js con questa:

async function startDashboard() {
    try {
        // 1. Carichiamo la nota
        await loadNote();

        // 2. Chiediamo al server qual è la città salvata
        const response = await fetch('/api/weather');
        const data = await response.json();

        if (data.status === "success") {
            currentCity = data.city || "Anagni";
            document.getElementById('city-display').innerText = currentCity;
        }
    } catch (e) {
        console.error("Errore inizializzazione:", e);
        currentCity = "Anagni"; // Fallback per non bloccare tutto
    }

    // 3. Ora che abbiamo una città, facciamo il primo aggiornamento serio
    updateDashboard();

    // 4. Avviamo i timer
    setInterval(updateDashboard, 30000);
    setInterval(updateClock, 1000);
}

// Avvia tutto
startDashboard();

