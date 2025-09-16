# init_db.py — cria tabelas no banco (sem Flask-Migrate)
try:
    from app import create_app
    flask_app = create_app()
except Exception:
    from app import app as flask_app

try:
    from app import db
except Exception:
    from app.models import db

if __name__ == "__main__":
    with flask_app.app_context():
        db.create_all()
        print("✅ Tabelas criadas (ou já existiam).")
