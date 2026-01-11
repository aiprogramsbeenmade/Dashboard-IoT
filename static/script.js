/**
 * IOT HOME HUB - DASHBOARD SCRIPT
 * Corretto: Aggiunto updateDashboard e Fix Collisioni Snake
 */

// --- 1. VARIABILI GLOBALI ---
let currentCity = "Roma";
let consumptionChart = null;
let gameInterval = null;
let box = 20;

// --- 2. GESTIONE ARCADE (MULTI-GIOCO) ---

function openArcade() {
    document.getElementById('arcade-modal').classList.remove('hidden');
}

function closeArcade() {
    document.getElementById('arcade-modal').classList.add('hidden');
    stopCurrentGame();
}

function stopCurrentGame() {
    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }
}

function backToMenu() {
    stopCurrentGame();
    document.getElementById('arcade-menu').classList.remove('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('arcadeScore').innerText = "0";
}

function initGame(gameType) {
    document.getElementById('arcade-menu').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');

    const title = document.getElementById('game-title');
    const btn = document.getElementById('arcadeActionBtn');

    stopCurrentGame();

    if (gameType === 'snake') {
        title.innerText = "Bit-Eater (Snake)";
        btn.innerText = "START MISSION";
        btn.onclick = () => startSnake();
    } else if (gameType === 'pong') {
        title.innerText = "Packet-Pong";
        btn.innerText = "BOOT PONG";
        btn.onclick = () => startPong();
    }
}

function startSnake() {
    const canvas = document.getElementById("arcadeCanvas");
    const ctx = canvas.getContext("2d");
    const sBox = 20;
    let snake = [{ x: 5 * sBox, y: 5 * sBox }];
    let food = { x: 10 * sBox, y: 10 * sBox };
    let direction = "RIGHT";
    let score = 0;

    stopCurrentGame();

    document.onkeydown = (e) => {
        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
        if(e.key === "ArrowLeft" && direction !== "RIGHT") direction = "LEFT";
        if(e.key === "ArrowUp" && direction !== "DOWN") direction = "UP";
        if(e.key === "ArrowRight" && direction !== "LEFT") direction = "RIGHT";
        if(e.key === "ArrowDown" && direction !== "UP") direction = "DOWN";
    };

    gameInterval = setInterval(() => {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#f43f5e";
        ctx.fillRect(food.x, food.y, sBox, sBox);

        snake.forEach((part, i) => {
            ctx.fillStyle = i === 0 ? "#22d3ee" : "#0891b2";
            ctx.fillRect(part.x, part.y, sBox, sBox);
        });

        let headX = snake[0].x;
        let headY = snake[0].y;

        if(direction === "LEFT") headX -= sBox;
        if(direction === "UP") headY -= sBox;
        if(direction === "RIGHT") headX += sBox;
        if(direction === "DOWN") headY += sBox;

        // FIX COLLISIONE: Controllo prima di aggiornare l'array
        if(headX < 0 || headX >= canvas.width || headY < 0 || headY >= canvas.height || snake.some(p => p.x === headX && p.y === headY)) {
            stopCurrentGame();
            alert("SISTEMA CRASHATO! Score: " + score);
            backToMenu();
            return;
        }

        if(headX === food.x && headY === food.y) {
            score++;
            document.getElementById("arcadeScore").innerText = score;
            food = {
                x: Math.floor(Math.random() * (canvas.width/sBox)) * sBox,
                y: Math.floor(Math.random() * (canvas.height/sBox)) * sBox
            };
        } else {
            snake.pop();
        }
        snake.unshift({ x: headX, y: headY });
    }, 100);
}

function startPong() {
    const canvas = document.getElementById("arcadeCanvas");
    const ctx = canvas.getContext("2d");
    let ball = { x: 200, y: 150, dx: 4, dy: 4, r: 7 };
    let paddle = { y: 125, h: 50, w: 10 };
    let score = 0;

    stopCurrentGame();

    document.onkeydown = (e) => {
        if(["ArrowUp","ArrowDown"].includes(e.key)) e.preventDefault();
        if(e.key === "ArrowUp") paddle.y -= 25;
        if(e.key === "ArrowDown") paddle.y += 25;
        paddle.y = Math.max(0, Math.min(canvas.height - paddle.h, paddle.y));
    };

    gameInterval = setInterval(() => {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();
        ctx.fillRect(10, paddle.y, paddle.w, paddle.h);

        ball.x += ball.dx; ball.y += ball.dy;
        if(ball.y < 0 || ball.y > canvas.height) ball.dy *= -1;
        if(ball.x > canvas.width) ball.dx *= -1;

        if(ball.x < 20 && ball.y > paddle.y && ball.y < paddle.y + paddle.h) {
            ball.dx *= -1.1;
            score++;
            document.getElementById("arcadeScore").innerText = score;
        } else if(ball.x < 0) {
            stopCurrentGame();
            alert("GAME OVER! Score: " + score);
            backToMenu();
        }
    }, 1000/60);
}

async function initChart() {
    const canvas = document.getElementById('consumptionChart');
    if (!canvas) {
        console.error("Errore: Elemento 'consumptionChart' non trovato nell'HTML.");
        return;
    }

    try {
        const response = await fetch('/api/shelly/history');
        if (!response.ok) throw new Error("Errore nel recupero dei dati storici");
        const dbData = await response.json();

        // Se non ci sono dati, mostra un log invece di mandare in crash il grafico
        if (!dbData.labels || dbData.labels.length === 0) {
            console.warn("Nessun dato storico disponibile per lo Shelly.");
            return;
        }

        const ctx = canvas.getContext('2d');
        if (consumptionChart) {
            consumptionChart.destroy(); // Distrugge il grafico precedente per evitare sovrapposizioni
        }

        // Creazione del grafico
        consumptionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dbData.labels,
                datasets: [{
                    label: 'Consumo (Watt)',
                    data: dbData.values,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    pointRadius: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        ticks: { color: '#94a3b8', font: { size: 10 } },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#94a3b8', font: { size: 10 } },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Errore durante l'inizializzazione del grafico:", error);
    }
}

// --- 3. MODALI E UI ---

window.toggleQR = () => {
    const modal = document.getElementById('qr-modal');
    if (modal) modal.classList.toggle('hidden');
};

window.openShellyDetails = (event) => {
    if (event.target.tagName === 'BUTTON') return;
    const modal = document.getElementById('shelly-modal');
    if (modal) { modal.classList.remove('hidden'); initChart(); }
};

window.closeModal = () => {
    document.getElementById('shelly-modal').classList.add('hidden');
};

window.toggleLight = async () => {
    try {
        const response = await fetch('/api/shelly/toggle');
        const data = await response.json();
        if (data.status === "success") updateDashboard();
    } catch (error) { console.error("Errore Shelly Toggle:", error); }
};

// --- 4. API E AGGIORNAMENTO DATI ---

async function fetchModule(url, updateFn) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data) updateFn(data);
    } catch (error) {
        console.error(`Errore su ${url}:`, error);
    }
}

async function updateDashboard() {
    console.log("Sincronizzazione globale in corso...");
    const statusDot = document.getElementById('status-dot');

    // METEO
    fetchModule(`/api/weather?city=${currentCity}`, (data) => {
        if(document.getElementById('temp')) document.getElementById('temp').innerText = (data.temp || "--") + "°C";
        if(document.getElementById('wind')) document.getElementById('wind').innerText = (data.wind || "--") + " km/h";
        if(document.getElementById('city-display')) document.getElementById('city-display').innerText = data.city || currentCity;
    });

    // CRYPTO
    fetchModule('/api/crypto', (data) => {
        if (data && data.price) {
            document.getElementById('crypto-price').innerText = data.price.toLocaleString() + " €";
            const changeEl = document.getElementById('crypto-change');
            if (changeEl) {
                changeEl.innerText = `${data.change_24h > 0 ? "+" : ""}${data.change_24h}%`;
                changeEl.className = data.change_24h >= 0 ? "text-emerald-400 font-bold text-sm" : "text-red-400 font-bold text-sm";
            }
        }
    });

    // QUALITÀ ARIA (AQI)
    fetchModule('/api/aqi', (data) => {
        const aqiVal = document.getElementById('aqi-val');
        const aqiLabel = document.getElementById('aqi-label');
        if (aqiVal && data.aqi) {
            aqiVal.innerText = data.aqi;
            aqiVal.className = `text-4xl font-bold mt-2 ${data.color || 'text-white'}`;
            if (aqiLabel) aqiLabel.innerText = data.label || "CARICAMENTO...";
        }
    });

    // RACCOLTA DIFFERENZIATA
    fetchModule('/api/waste', (res) => {
        const data = res.data;
        const todayEl = document.getElementById('waste-today');
        const tomorrowEl = document.getElementById('waste-tomorrow');
        if (todayEl && data.today) {
            todayEl.innerText = data.today.label;
            todayEl.className = `text-xl font-bold ${data.today.color}`;
        }
        if (tomorrowEl && data.tomorrow) tomorrowEl.innerText = data.tomorrow.label || "Nessuno";
    });

    // SHELLY
    fetchModule('/api/shelly', (data) => {
        const statusEl = document.getElementById('shelly-status');
        const powerEl = document.getElementById('shelly-power');
        const card = document.getElementById('shelly-card');
        if (statusEl) statusEl.innerText = data.ison ? "Acceso" : "Spento";
        if (powerEl) powerEl.innerText = `${data.power || "0"} W`;
        if (card) card.style.borderLeftColor = data.ison ? "#10b981" : "#64748b";
    });

    // SYSTEM (CPU & RAM)
    fetchModule('/api/system', (data) => {
        if(document.getElementById('cpu-val')) document.getElementById('cpu-val').innerText = `${data.cpu || "0"}%`;
        if(document.getElementById('cpu-bar')) document.getElementById('cpu-bar').style.width = `${data.cpu || "0"}%`;
        if(document.getElementById('ram-val')) document.getElementById('ram-val').innerText = `${data.ram_used || "0"} / ${data.ram_total || "0"} GB`;
    });

    // PING
    fetchModule('/api/ping', (data) => {
        const val = document.getElementById('ping-val');
        if (val && data.ms !== undefined) {
            val.innerText = Math.round(data.ms);
            val.style.color = data.ms < 50 ? "#22d3ee" : data.ms < 100 ? "#facc15" : "#ef4444";
        }
    });

    if (statusDot) {
        statusDot.innerHTML = `<span class="relative flex h-3 w-3 mr-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>Sistema Online`;
    }
}

async function initWiFiQR() {
    const mini = document.getElementById("qrcode-mini");
    const big = document.getElementById("qrcode-big");
    if (!mini || !big) return;
    try {
        const response = await fetch('/api/wifi-info');
        const data = await response.json();
        // Formato standard Android/iOS per la connessione automatica
        const qrContent = `WIFI:S:${data.ssid};T:${data.encryption};P:${data.password};;`;

        if (document.getElementById('display-ssid')) {
            document.getElementById('display-ssid').innerText = data.ssid;
        }

        mini.innerHTML = ""; big.innerHTML = ""; // Pulisce i QR precedenti

        // Genera il QR piccolo per la card
        new QRCode(mini, { text: qrContent, width: 60, height: 60, colorDark: "#ffffff", colorLight: "transparent" });
        // Genera il QR grande per il modal
        new QRCode(big, { text: qrContent, width: 250, height: 250 });
    } catch (err) {
        console.error("Errore generazione QR Wi-Fi:", err);
    }
}

// --- 5. TIMER E AVVIO ---

function updateClock() {
    const now = new Date();
    const t = document.getElementById('clock-time');
    const d = document.getElementById('clock-date');
    if (t) t.innerText = now.toLocaleTimeString('it-IT');
    if (d) d.innerText = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}

document.addEventListener('DOMContentLoaded', () => {
    // Gestione click sulla card Wi-Fi per aprire il modal
    const qrCard = document.getElementById('qr-card');
    if (qrCard) {
        qrCard.addEventListener('click', window.toggleQR);
    }

    updateClock();
    updateDashboard();
    initWiFiQR(); // <--- Questa è fondamentale per far apparire i QR!

    setInterval(updateClock, 1000);
    setInterval(updateDashboard, 30000);
});