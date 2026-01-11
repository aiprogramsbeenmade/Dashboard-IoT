import requests

def get_weather_data(city_name="Rome"):
    try:
        # 1. Trasformiamo il nome della città in coordinate
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city_name}&count=1&language=it&format=json"
        geo_res = requests.get(geo_url, timeout=5)
        geo_data = geo_res.json()

        if not geo_data.get("results"):
            return {"status": "error", "message": "Città non trovata"}

        location = geo_data["results"][0]
        lat, lon = location["latitude"], location["longitude"]

        # 2. Chiamiamo l'API del meteo con le coordinate ottenute
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
        response = requests.get(weather_url, timeout=5)
        data = response.json()

        current = data.get("current_weather", {})
        return {
            "status": "success",
            "city": location.get("name"),
            "temp": current.get("temperature"), # Cambiato in 'temp' per matchare il JS
            "wind": current.get("windspeed")    # Cambiato in 'wind' per matchare il JS
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}