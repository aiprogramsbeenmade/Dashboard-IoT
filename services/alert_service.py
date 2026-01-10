import os
import telebot
import time
from dotenv import load_dotenv
import subprocess

# Carichiamo le variabili dal file .env che hai sul Mac
load_dotenv()

TOKEN = os.getenv("TELEGRAM_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

# Inizializziamo il bot con la libreria telebot
bot = telebot.TeleBot(TOKEN)

def get_tailscale_ip():
    try:
        # Esegue il comando 'tailscale ip -4' che restituisce solo l'IP della rete sicura
        ip = subprocess.check_output(["tailscale", "ip", "-4"]).decode("utf-8").strip()
        return ip
    except Exception:
        # Se Tailscale è spento o non installato, restituisce un messaggio di errore
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

# Questo blocco viene eseguito SOLO se lanci questo file direttamente
if __name__ == "__main__":
    ts_ip = get_tailscale_ip()
    msg = f"✅ <b>Sistema Online!</b>\n🛡️ Tailscale IP: <code>{ts_ip}</code>\n🚀 Dashboard pronta all'uso."
    send_telegram_alert(msg)
    print(f"Bot avviato con IP Tailscale: {ts_ip}")
    bot.polling(none_stop=True)