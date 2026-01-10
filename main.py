import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Carica subito le variabili d'ambiente
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Import dai tuoi servizi
from services.weather_service import get_weather_data
from services.crypto_service import get_crypto_data
from services.shelly_services import get_shelly_status
from services.system_service import get_system_status
from services.aqi_service import get_aqi_data
from services.ping_service import get_ping_latency
from services.waste_service import get_waste_info
from services.alert_service import send_telegram_alert

# Import dal database
from database import (
    init_db,
    save_power_reading,
    get_recent_readings,
    save_note,
    get_note,
    get_setting,
    update_setting,
    init_waste_db,      # <--- AGGIUNGI QUESTA
    update_waste_day    # <--- AGGIUNGI QUESTA (serve per il bot)
)

TELEGRAM_URL = f"https://api.telegram.org/bot{os.getenv('TELEGRAM_TOKEN')}"

# Registro alert
last_alerts = {"cpu": datetime.min, "aqi": datetime.min, "ping": datetime.min}
ALERT_COOLDOWN = timedelta(minutes=15)

def should_send_alert(category):
    now = datetime.now()
    if now - last_alerts[category] > ALERT_COOLDOWN:
        last_alerts[category] = now
        return True
    return False

app = FastAPI()

# Inizializza il DB (crea tabelle se non esistono)
init_db()
init_waste_db()

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')

# --- ENDPOINT API ---

@app.get("/api/weather")
async def weather_endpoint(city: str = None):
    if not city or city == "undefined":
        city = get_setting("city") or "Anagni"
    return get_weather_data(city)

@app.get("/api/crypto")
async def crypto_endpoint():
    return get_crypto_data()

@app.get("/api/shelly")
async def shelly_endpoint():
    data = get_shelly_status('192.168.5.101')
    if data["status"] == "success":
        save_power_reading(data["power"])
    return data

@app.get("/api/shelly/toggle")
async def shelly_toggle():
    url = "http://192.168.5.101/light/0?turn=toggle"
    try:
        response = requests.get(url, timeout=3)
        return {"status": "success", "data": response.json()}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/shelly/history")
async def shelly_history():
    history = get_recent_readings(20)
    labels = [row[0].split(" ")[1] for row in history]
    values = [row[1] for row in history]
    return {"status": "success", "labels": labels, "values": values}

@app.get("/api/system")
async def system_endpoint():
    data = get_system_status()
    if data["cpu"] > 90 and should_send_alert("cpu"):
        send_telegram_alert(f"⚠️ <b>Allerta CPU</b>\nCarico: {data['cpu']}%")
    return data

@app.get("/api/aqi")
async def aqi_endpoint():
    data = get_aqi_data("Rome")
    if data.get("status") == "success" and data.get("aqi", 0) > 100 and should_send_alert("aqi"):
        send_telegram_alert(f"🌫 <b>Aria</b>\nLivello AQI: {data['aqi']}")
    return data

@app.get("/api/ping")
async def ping_endpoint():
    data = get_ping_latency()
    if data["ms"] > 500 and should_send_alert("ping"):
        send_telegram_alert(f"🐢 <b>Lag</b>\nPing: {data['ms']}ms")
    return data

@app.get("/api/note")
async def read_note():
    return {"status": "success", "note": get_note()}

@app.post("/api/note")
async def write_note(data: dict):
    save_note(data.get("note", ""))
    return {"status": "success"}

# --- GESTIONE TELEGRAM BOT ---

def send_message(chat_id, text, reply_markup=None):
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        requests.post(f"{TELEGRAM_URL}/sendMessage", json=payload, timeout=5)
    except Exception as e:
        print(f"Errore invio Telegram: {e}")

@app.post("/api/telegram/webhook")
async def telegram_webhook(update: dict):
    # Messaggi di testo
    if "message" in update:
        text = update["message"].get("text", "")
        chat_id = update["message"]["chat"]["id"]

        if text == "/editwaste":
            keyboard = {
                "inline_keyboard": [
                    [{"text": "Lun", "callback_data": "day_0"}, {"text": "Mar", "callback_data": "day_1"}, {"text": "Mer", "callback_data": "day_2"}],
                    [{"text": "Gio", "callback_data": "day_3"}, {"text": "Ven", "callback_data": "day_4"}, {"text": "Sab", "callback_data": "day_5"}],
                    [{"text": "Dom", "callback_data": "day_6"}]
                ]
            }
            send_message(chat_id, "📅 <b>Calendario Rifiuti</b>\nScegli il giorno da modificare:", keyboard)

    # Click pulsanti
    elif "callback_query" in update:
        query = update["callback_query"]
        data = query["data"]
        chat_id = query["message"]["chat"]["id"]

        if data.startswith("day_"):
            day_idx = data.split("_")[1]
            days = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"]
            keyboard = {
                "inline_keyboard": [
                    [{"text": "🍎 Umido", "callback_data": f"set_{day_idx}_Umido"}],
                    [{"text": "📄 Carta", "callback_data": f"set_{day_idx}_Carta"}],
                    [{"text": "🟡 Plastica", "callback_data": f"set_{day_idx}_Plastica"}],
                    [{"text": "🗑 Indifferenziata", "callback_data": f"set_{day_idx}_Indifferenziato"}],
                    [{"text": "🍾 Vetro", "callback_data": f"set_{day_idx}_Vetro"}],
                    [{"text": "❌ Nessuno", "callback_data": f"set_{day_idx}_Nessuno"}]
                ]
            }
            send_message(chat_id, f"Cosa si ritira il <b>{days[int(day_idx)]}</b>?", keyboard)

        elif data.startswith("set_"):
            _, day_idx, label = data.split("_")
            # Aggiorna il Database
            update_waste_day(int(day_idx), label)
            send_message(chat_id, f"✅ Configurazione salvata!\n<b>Giorno {day_idx}</b> impostato su <b>{label}</b>.")

    return {"status": "ok"}

# --- WIFI & WASTE ---

@app.get("/api/wifi-info")
async def wifi_info():
    ssid = os.getenv("WIFI_SSID")
    pwd = os.getenv("WIFI_PASSWORD")
    if not ssid or not pwd:
        raise HTTPException(status_code=500, detail="Configurazione WiFi incompleta")
    return {"ssid": ssid, "password": pwd, "encryption": os.getenv("WIFI_ENCRYPTION", "WPA")}

@app.get("/api/waste")
async def waste_endpoint():
    return {"status": "success", "data": get_waste_info()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)