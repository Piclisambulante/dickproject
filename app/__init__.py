
import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from dotenv import load_dotenv
from flask_wtf.csrf import CSRFProtect, generate_csrf
import sentry_sdk

db = SQLAlchemy()
login_manager = LoginManager()
csrf = CSRFProtect()

def create_app():
    load_dotenv()

    if os.getenv("SENTRY_DSN"):
        sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"), traces_sample_rate=0.1)

    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
    db_url = os.getenv("DATABASE_URL")
    if db_url and db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    app.config["SQLALCHEMY_DATABASE_URI"] = db_url or "sqlite:///local.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Logging
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s :: %(message)s")

    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    csrf.init_app(app)

    # make csrf token available in templates
    @app.context_processor
    def inject_csrf():
        return dict(csrf_token=generate_csrf)

    # Blueprints
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

    # Create tables locally only (in production use Alembic)
    if os.getenv("FLASK_ENV") == "development":
        with app.app_context():
            from . import models
            db.create_all()

    return app
