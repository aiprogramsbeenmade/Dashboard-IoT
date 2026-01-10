from database import get_full_waste_calendar
from datetime import datetime

WASTE_COLORS = {
    "Umido": {"color": "text-orange-400", "bg": "border-orange-500"},
    "Carta": {"color": "text-blue-400", "bg": "border-blue-500"},
    "Plastica": {"color": "text-yellow-400", "bg": "border-yellow-500"},
    "Indifferenziato": {"color": "text-slate-400", "bg": "border-slate-500"},
    "Vetro": {"color": "text-emerald-400", "bg": "border-emerald-500"},
    "Nessuno": {"color": "text-slate-500", "bg": "border-slate-700"}
}


def get_waste_info():
    db_calendar = get_full_waste_calendar()

    today_idx = datetime.now().weekday()
    tomorrow_idx = (today_idx + 1) % 7

    today_label = db_calendar.get(today_idx, "Nessuno")
    tomorrow_label = db_calendar.get(tomorrow_idx, "Nessuno")

    return {
        "today": {**WASTE_COLORS.get(today_label, WASTE_COLORS["Nessuno"]), "label": today_label},
        "tomorrow": {"label": tomorrow_label}
    }