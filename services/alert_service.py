import os
import telebot
import time
from dotenv import load_dotenv
import subprocess
import psutil

# Carichiamo le variabili dal file .env che hai sul Mac
load_dotenv()

TOKEN = os.getenv("TELEGRAM_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

# Inizializziamo il bot con la libreria telebot
bot = telebot.TeleBot(TOKEN)

def get_system_status():
    # Temperatura (Funziona solo su Raspberry)
    try:
        temp = subprocess.check_output(["vcgencmd", "measure_temp"]).decode("utf-8").replace("temp=", "")
    except:
        temp = "N/D"

    # Uso CPU e RAM
    cpu_usage = psutil.cpu_percent(interval=1)
    ram = psutil.virtual_memory()
    disk = psutil.disk_usage('/')

    status_msg = (
        f"🌡️ <b>Temp:</b> {temp}\n"
        f"📊 <b>CPU:</b> {cpu_usage}%\n"
        f"🧠 <b>RAM:</b> {ram.percent}%\n"
        f"💽 <b>Disco:</b> {disk.percent}%"
    )
    return status_msg

def get_tailscale_ip():
    for i in range(10):  # Prova per 10 volte
        try:
            ip = subprocess.check_output(["tailscale", "ip", "-4"]).decode("utf-8").strip()
            if ip:
                return ip
        except Exception:
            pass
        print(f"In attesa di Tailscale (tentativo {i+1}/10)...")
        time.sleep(2)  # Aspetta 2 secondi tra un tentativo e l'altro
    return "Tailscale non attivo"
def send_telegram_alert(message):
    """
    Questa funzione rimane identica per non rompere main.py.
    Viene chiamata dalla Dashboard per inviare notifiche.
    """
    try:
        # Usiamo il metodo di telebot invece di requests per uniformità
        bot.send_message(CHAT_ID, message, parse_mode="HTML")
        return True
    except Exception as e:
        print(f"Errore invio Telegram: {e}")
        return False

# --- LOGICA PER IL COMANDO REBOOT ---

@bot.message_handler(commands=['reboot'])
def handle_reboot(message):
    # Sicurezza: rispondi solo se l'ID combacia con il tuo .env
    if str(message.chat.id) == CHAT_ID:
        bot.reply_to(message, "🚨 <b>Comando di emergenza ricevuto.</b>\nIl Raspberry si riavvierà tra 5 secondi...", parse_mode="HTML")
        print("Richiesta di reboot autorizzata. Esecuzione...")
        time.sleep(5)
        # Comando di sistema per il riavvio
        os.system('sudo reboot')
    else:
        bot.reply_to(message, "🚫 <b>Accesso negato.</b>\nNon sei autorizzato a riavviare questo server.")

@bot.message_handler(commands=['status'])
def handle_status(message):
    if str(message.chat.id) == CHAT_ID:
        status = get_system_status()
        bot.reply_to(message, f"📋 <b>Stato Attuale:</b>\n\n{status}", parse_mode="HTML")

# Questo blocco viene eseguito SOLO se lanci questo file direttamente
if __name__ == "__main__":
    ts_ip = get_tailscale_ip()
    status = get_system_status()

    # Creiamo il link completo alla dashboard
    dashboard_url = f"http://{ts_ip}:8000"

    msg = (
        f"✅ <b>Sistema Online!</b>\n"
        f"🛡️ Tailscale IP: <code>{ts_ip}</code>\n"
        f"🌐 Dashboard: <a href='{dashboard_url}'>{dashboard_url}</a>\n"
        f"📋 <b>Stato iniziale:</b>\n{status}"
        f"🚀 Servizi pronti all'uso."
    )

    print(f"Bot avviato. Dashboard raggiungibile su: {dashboard_url}")
    send_telegram_alert(msg)
    bot.polling(none_stop=True)