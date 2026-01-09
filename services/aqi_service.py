import requests
import os
from dotenv import load_dotenv

load_dotenv()


def get_aqi_data(city="here"):  # Puoi cambiare con la tua città o usare "here"
    TOKEN = os.getenv("AQI_TOKEN")
    url = f"https://api.waqi.info/feed/{city}/?token={TOKEN}"

    try:
        response = requests.get(url, timeout=5)
        data = response.json()

        if data["status"] == "ok":
            aqi = data["data"]["aqi"]
            # Determiniamo il livello di salute
            label = "Ottima"
            color = "text-emerald-400"
            if aqi > 50:
                label = "Moderata"
                color = "text-yellow-400"
            if aqi > 100:
                label = "Malsana"
                color = "text-orange-500"
            if aqi > 150:
                label = "Pessima"
                color = "text-red-500"

            return {
                "status": "success",
                "aqi": aqi,
                "label": label,
                "color": color,
                "city": data["data"]["city"]["name"]
            }
        return {"status": "error", "message": "Città non trovata"}
    except Exception as e:
        return {"status": "error", "message": str(e)}