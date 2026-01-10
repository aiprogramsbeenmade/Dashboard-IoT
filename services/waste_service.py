from datetime import datetime


def get_waste_info():
    # Mappa dei rifiuti di Anagni
    # Lun: Umido, Mar: Carta, Mer: Umido, Gio: Plastica/Metalli, Ven: Indifferenziato, Sab: Umido
    calendar = {
        0: {"label": "Umido", "color": "text-orange-400", "bg": "border-orange-500"},
        1: {"label": "Carta e Cartone", "color": "text-blue-400", "bg": "border-blue-500"},
        2: {"label": "Umido", "color": "text-orange-400", "bg": "border-orange-500"},
        3: {"label": "Plastica e Metalli", "color": "text-yellow-400", "bg": "border-yellow-500"},
        4: {"label": "Indifferenziato", "color": "text-slate-400", "bg": "border-slate-500"},
        5: {"label": "Umido", "color": "text-orange-400", "bg": "border-orange-500"},
        6: {"label": "Nessun Ritiro", "color": "text-slate-500", "bg": "border-slate-700"}
    }

    today_idx = datetime.now().weekday()
    tomorrow_idx = (today_idx + 1) % 7

    return {
        "today": calendar[today_idx],
        "tomorrow": calendar[tomorrow_idx]
    }