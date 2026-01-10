import os
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from services.weather_service import get_weather_data
from services.crypto_service import get_crypto_data
from services.shelly_services import get_shelly_status
import requests
from database import init_db, save_power_reading, get_recent_readings
from services.system_service import get_system_status
from services.aqi_service import get_aqi_data
from services.ping_service import get_ping_latency
from database import (
    init_db, save_power_reading, get_recent_readings,
    save_note, get_note, get_setting, update_setting # <-- Aggiungi queste ultime due
)
from services.alert_service import send_telegram_alert
from datetime import datetime, timedelta
from services.alert_service import send_telegram_alert
from services.waste_service import get_waste_info # In alto con gli altri import



# Registro per evitare notifiche ripetitive
last_alerts = {
    "cpu": datetime.min,
    "aqi": datetime.min,
    "ping": datetime.min
}

# Intervallo minimo tra un alert e l'altro (es. 15 minuti)
ALERT_COOLDOWN = timedelta(minutes=15)

def should_send_alert(category):
    now = datetime.now()
    if now - last_alerts[category] > ALERT_COOLDOWN:
        last_alerts[category] = now
        return True
    return False


app = FastAPI()

init_db()


# Serve per rendere accessibili i file HTML, CSS e JS nella cartella static
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    # Quando apri l'indirizzo base, restituisce la pagina HTML
    return FileResponse('static/index.html')


@app.get("/api/weather")
async def weather_endpoint(city: str = None):
    # Se il frontend non manda nulla, leggiamo dal DB
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
        # Salviamo il dato nel database ogni volta che viene letto!
        save_power_reading(data["power"])
    return data

@app.get("/api/shelly/toggle")
async def shelly_toggle():
    ip = "192.168.5.101"
    # Per lo Shelly RGBW2 in modalità light l'URL è questo:
    url = f"http://{ip}/light/0?turn=toggle"
    try:
        response = requests.get(url, timeout=3)
        return {"status": "success", "data": response.json()}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/shelly/history")
async def shelly_history():
    history = get_recent_readings(20)
    # Formattiamo i dati per Chart.js
    labels = [row[0].split(" ")[1] for row in history] # Solo l'ora, non la data
    values = [row[1] for row in history]
    return {"status": "success", "labels": labels, "values": values}


@app.get("/api/system")
async def system_endpoint():
    data = get_system_status()
    if data["cpu"] > 90 and should_send_alert("cpu"):
        send_telegram_alert(f"⚠️ <b>Allerta CPU</b>\nIl server è sotto carico: {data['cpu']}%")
    return data


@app.get("/api/aqi")
async def aqi_endpoint():
    # Inserisci la tua città
    data = get_aqi_data("Rome")

    # Controlliamo che la risposta sia valida e contenga la chiave 'aqi'
    if data.get("status") == "success" and "aqi" in data:
        if data["aqi"] > 100 and should_send_alert("aqi"):
            send_telegram_alert(f"🌫 <b>Qualità Aria</b>\nLivello AQI elevato: {data['aqi']} ({data['label']})")

    return data
@app.get("/api/ping")
async def ping_endpoint():
    data = get_ping_latency()
    if data["ms"] > 500 and should_send_alert("ping"):
        send_telegram_alert(f"🐢 <b>Rete Lenta</b>\nLatenza elevata rilevata: {data['ms']}ms")
    return data
@app.get("/api/note")
async def read_note():
    return {"status": "success", "note": get_note()}

@app.post("/api/note")
async def write_note(data: dict):
    save_note(data.get("note", ""))
    return {"status": "success"}

@app.post("/api/settings/city")
async def save_city(data: dict):
    new_city = data.get("city")
    if new_city:
        update_setting("city", new_city)
        return {"status": "success"}
    return {"status": "error", "message": "Città non valida"}

@app.get("/api/test-telegram")
async def test_telegram():
    success = send_telegram_alert("🚀 <b>Test Dashboard</b>\nIl bot è configurato correttamente!")
    if success:
        return {"status": "success", "message": "Controlla Telegram!"}
    return {"status": "error", "message": "Errore nell'invio. Controlla Token e ID."}

@app.get("/api/wifi-info")
async def wifi_info():
    ssid = os.getenv("WIFI_SSID")
    pwd = os.getenv("WIFI_PASSWORD")
    enc = os.getenv("WIFI_ENCRYPTION", "WPA")

    if not ssid or not pwd:
        # Questo apparirà nel terminale se c'è un errore
        print("ERRORE: Variabili WIFI non trovate nel .env!")
        raise HTTPException(status_code=500, detail="Configurazione WiFi incompleta")

    return {
        "ssid": ssid,
        "password": pwd,
        "encryption": enc
    }

@app.get("/api/waste")
async def waste_endpoint():
    return {"status": "success", "data": get_waste_info()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)