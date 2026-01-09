import requests


def get_shelly_status(ip_address='192.168.5.101'):
    try:
        response = requests.get(f"http://{ip_address}/status", timeout=2)
        data = response.json()

        is_on = False
        power = 0

        # CASO 1: Dispositivi Light (Il tuo caso attuale!)
        if 'lights' in data:
            is_on = data['lights'][0]['ison']
            power = data['lights'][0].get('power', 0)

        # CASO 2: Dispositivi Relay (Shelly 1, Plug, etc.)
        elif 'relays' in data:
            is_on = data['relays'][0]['ison']
            power = data.get('meters', [{}])[0].get('power', 0)

        # CASO 3: Gen 2/3 (Plus, Pro)
        else:
            # Se non troviamo né lights né relays, proviamo l'RPC per sicurezza
            response = requests.get(f"http://{ip_address}/rpc/Shelly.GetStatus", timeout=2)
            gen2_data = response.json()
            if 'switch:0' in data:
                is_on = gen2_data['switch:0']['output']
                power = gen2_data['switch:0'].get('apower', 0)

        return {
            "status": "success",
            "ison": is_on,
            "power": round(power, 1),
            "label": "Acceso" if is_on else "Spento"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}