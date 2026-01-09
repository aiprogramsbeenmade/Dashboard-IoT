import requests


def get_crypto_data(coin_id="bitcoin", vs_currency="eur"):
    url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_id}&vs_currencies={vs_currency}&include_24hr_change=true"
    try:
        # Nota: CoinGecko a volte limita le richieste rapide, impostiamo un timeout
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()

        coin_info = data.get(coin_id, {})
        return {
            "status": "success",
            "name": coin_id.capitalize(),
            "price": coin_info.get(vs_currency),
            "change_24h": round(coin_info.get(f"{vs_currency}_24h_change", 0), 2)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}