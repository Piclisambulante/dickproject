import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect, generate_csrf
from dotenv import load_dotenv
import sentry_sdk

db = SQLAlchemy()
login_manager = LoginManager()
csrf = CSRFProtect()


def create_app():
    # carrega .env
    load_dotenv()

    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")

    # ----- Banco de dados (psycopg v3 compat) -----
    db_url = os.getenv("DATABASE_URL")
    if db_url and db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
    app.config["SQLALCHEMY_DATABASE_URI"] = db_url or "sqlite:///local.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # ----- Logging -----
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s :: %(message)s"
    )

    # ----- Sentry (opcional) -----
    if os.getenv("SENTRY_DSN"):
        sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"), traces_sample_rate=0.1)

    # ----- Extensões -----
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    csrf.init_app(app)

    @app.context_processor
    def inject_csrf():
        return dict(csrf_token=generate_csrf)

    # ----- Cloudinary (opcional) -----
    try:
        from .cloud import configure_cloudinary_from_env
        configure_cloudinary_from_env()
    except Exception as e:
        logging.warning(f"Cloudinary not configured: {e}")

    # ----- Blueprints das rotas -----
    from .routes.public import public_bp
    from .routes.shop import shop_bp
    from .routes.auth import auth_bp
    from .routes.api import api_bp
    from .routes.webhooks import webhooks_bp
    from .routes.admin import admin_bp

    app.register_blueprint(public_bp)
    app.register_blueprint(shop_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(webhooks_bp, url_prefix="/webhook")
    app.register_blueprint(admin_bp, url_prefix="/admin")

    # Endpoint de debug do PIX (só se DEBUG=1)
    try:
        if app.debug:
            from .debug_routes import bp as pix_debug_bp  # <-- 'bp' é o nome do blueprint
            app.register_blueprint(pix_debug_bp)
    except Exception as e:
        app.logger.debug(f"PIX debug blueprint not registered: {e}")

    # ----- criar tabelas + seed admin idempotente -----
    with app.app_context():
        # garante que models carregaram
        from . import models
        db.create_all()

        # seed robusto (idempotente, usa variáveis do .env)
        try:
            from .auto_seed_admin import seed_admin
            seed_admin(app)
        except Exception as e:
            app.logger.warning("Admin seed skipped: %s", e)

    return app
