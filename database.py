import sqlite3
from datetime import datetime

DB_NAME = "home_iot.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    # Creiamo una tabella per i consumi dello Shelly
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS shelly_power (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME,
            watt REAL
        )
    ''')
    cursor.execute('''
            CREATE TABLE IF NOT EXISTS quick_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT
            )
        ''')
    cursor.execute('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)')
    # Inseriamo Anagni se non c'è nulla, così il primo avvio non fallisce
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('city', 'Anagni')")
    conn.commit()
    conn.close()

def save_power_reading(watt):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO shelly_power (timestamp, watt) VALUES (?, ?)",
                   (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), watt))
    conn.commit()
    conn.close()

def get_recent_readings(limit=20):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    # Prendiamo gli ultimi rilievi per il grafico
    cursor.execute("SELECT timestamp, watt FROM shelly_power ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    # Invertiamo l'ordine per avere il grafico che va da sinistra a destra (cronologico)
    return rows[::-1]

def save_note(text):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    # Cancelliamo la nota precedente per tenerne solo una (o puoi modificarlo per averne molte)
    cursor.execute("DELETE FROM quick_notes")
    cursor.execute("INSERT INTO quick_notes (content) VALUES (?)", (text,))
    conn.commit()
    conn.close()

def get_note():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT content FROM quick_notes LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else ""

def update_setting(key, value):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, value))
    conn.commit()
    conn.close()

def get_setting(key):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        return row[0] if row else None
    except Exception as e:
        print(f"Errore database: {e}")
        return None
    finally:
        conn.close()