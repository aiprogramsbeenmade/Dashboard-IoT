# 🚀 IoT Home Hub Dashboard

Una dashboard domotica avanzata e interattiva basata su **Python (Flask)** e **Tailwind CSS**. Monitora il sistema, gestisci i dispositivi Shelly, controlla il meteo e divertiti con i giochi arcade integrati, tutto da un'unica interfaccia in stile Glassmorphism.



## ✨ Caratteristiche principali

-   **Monitoraggio Sistema:** Visualizzazione in tempo reale di CPU, RAM e Latenza di rete (Ping).
-   **Domotica Shelly:** Integrazione con relè Shelly per accensione luci e grafico storico dei consumi tramite Chart.js.
-   **Meteo & Ambiente:** Previsioni meteo locali e monitoraggio della qualità dell'aria (AQI).
-   **Bit-Eater Arcade:** Una console integrata con giochi classici (Snake, Pong) per i momenti di pausa.
-   **Wi-Fi Guest:** Generazione automatica di QR Code per permettere agli ospiti di connettersi rapidamente alla rete.
-   **Eco-Friendly:** Modulo dedicato alla raccolta differenziata per non dimenticare mai quale bidone esporre.

## 🛠️ Tech Stack

-   **Backend:** Python 3.x, Flask
-   **Frontend:** HTML5, Tailwind CSS, JavaScript (ES6+)
-   **Grafici:** Chart.js
-   **Utility:** QRCode.js per la gestione degli accessi Wi-Fi.

## 🚀 Installazione Rapida

1. **Clona il repository:**
   ```bash
   git clone https://github.com/aiprogramsbeenmade/Dashboard-IoT.git 
   cd Dashboard-IoT

2. **Installa le dipendenze:**
   ```bash
   pip3 install -r requirements.txt
3. **Configurazione:**
   Modifica il file `sample.env` aggiungendo tutte le tue chiavi API, successivamente rinominalo come `.env`.

4. **Avvia il server:**
   ```bash
   python3 main.py
   ```
    La dashboard sarà disponibile su http://localhost:8000.

## 🎮 Arcade Mode & Gaming
La dashboard integra una **Console Arcade** isolata in un ambiente Modal per un'esperienza di gioco immersiva.
- **Bit-Eater (Snake):** Motore di gioco ricostruito con buffer di direzione per evitare auto-collisioni involontarie e gestione dinamica del canvas.
- **Packet-Pong:** Un omaggio ai classici, con fisica della pallina accelerata per aumentare la sfida.
- **Multi-Game System:** Architettura modulare che permette di aggiungere nuovi giochi semplicemente estendendo il file `script.js`.

## 🍎 Integrazione Apple Shortcuts (iOS)
Il progetto è ottimizzato per l'ecosistema Apple tramite l'app **Comandi Rapidi**:
- **Auto-VPN:** Automazione impostata per attivare/disattivare il tunnel VPN (Tailscale) all'apertura e chiusura di Chrome.
- **Dashboard Web App:** Collegamento rapido sulla Home di iOS per un accesso full-screen alla dashboard, simulando un'app nativa.

## ⚙️ Dettagli Tecnici
- **Glassmorphism UI:** Layout basato su trasparenze, sfocature (backdrop-filter) e bordi dinamici che reagiscono allo stato dei dispositivi (es. bordo verde se la luce Shelly è attiva).
- **Safe Collision Engine:** Algoritmo di rilevamento collisioni basato su array state-check, ottimizzato per evitare crash logici del browser.
- **Responsive Grid:** Griglia adattiva `4-cols` che si ridimensiona automaticamente per smartphone e tablet.



## 🛠️ Manutenzione e Sviluppo
Il codice è organizzato in moduli logici per facilitare il debug:
1.  **Variabili Globali:** Gestione stati e intervalli.
2.  **Arcade Engine:** Logica dei motori grafici su Canvas.
3.  **UI/Modal Manager:** Gestione dei livelli di interfaccia.
4.  **API Sinc:** Sincronizzazione asincrona con i sensori e i servizi esterni.

---
*Developed for a smart, automated, and fun home environment.*