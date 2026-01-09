import psutil
import platform


def get_system_status():
    try:
        cpu_usage = psutil.cpu_percent(interval=0.5)
        ram = psutil.virtual_memory()

        return {
            "status": "success",
            "cpu": cpu_usage,
            "ram_perc": ram.percent,
            "ram_used": round(ram.used / (1024 ** 3), 1),  # In GB
            "ram_total": round(ram.total / (1024 ** 3), 1),  # In GB
            "os": platform.system()
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}