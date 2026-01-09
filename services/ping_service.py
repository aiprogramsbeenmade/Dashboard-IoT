import subprocess
import platform


def get_ping_latency(host="8.8.8.8"):
    # Determiniamo il parametro corretto in base al sistema operativo
    param = "-n" if platform.system().lower() == "windows" else "-c"
    command = ["ping", param, "1", host]

    try:
        # Esegue il comando e cattura l'output
        output = subprocess.check_output(command, stderr=subprocess.STDOUT, universal_newlines=True)

        # Estraiamo il tempo (ms) dall'output del comando
        # Cerchiamo la stringa "time=" o "mdev =" a seconda del sistema
        if "time=" in output:
            latency = output.split("time=")[1].split(" ")[0]
            return {"status": "success", "ms": float(latency), "host": host}

        return {"status": "error", "message": "Impossibile leggere la latenza"}
    except Exception as e:
        return {"status": "error", "message": str(e)}