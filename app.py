# app.py — runner universal
import os
# Clear the terminal
os.system("cls")

try:
    from app import create_app
    app = create_app()
    print("👉 Usando factory create_app()")
except Exception:
    from app import app
    print("👉 Usando app global")

if __name__ == "__main__":
    host = os.getenv("FLASK_RUN_HOST","127.0.0.1")
    port = int(os.getenv("FLASK_RUN_PORT","5000"))
    debug = os.getenv("FLASK_DEBUG","1") in ("1","true","True")
    app.run(host=host, port=port, debug=debug)
