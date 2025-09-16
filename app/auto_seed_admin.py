# app/auto_seed_admin.py — cria/ajusta um usuário admin de forma idempotente
import os
from datetime import datetime

def seed_admin(app):
    """
    Lê variáveis de ambiente:
      ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
    Defaults:
      email=admin@example.com, senha=admin123, nome=Admin
    - Se já existir o usuário, garante name e is_admin=True.
    - Se existir método set_password, usa; senão, gera hash (werkzeug).
    - Idempotente e silencioso em erro não-crítico.
    """
    from .models import db
    # tenta achar classe User no models
    User = None
    for maybe in ("User", "Users", "Usuario", "UserModel"):
        try:
            mod = __import__("app.models", fromlist=[maybe])
            if hasattr(mod, maybe):
                User = getattr(mod, maybe)
                break
        except Exception:
            pass
    if User is None:
        raise RuntimeError("Classe User não encontrada em app.models")

    email = os.getenv("ADMIN_EMAIL", "admin@example.com").strip().lower()
    name  = os.getenv("ADMIN_NAME",  "Admin").strip() or "Admin"
    pwd   = os.getenv("ADMIN_PASSWORD", "admin123")

    # procura existente
    exists = db.session.query(User).filter(getattr(User, "email")==email).first()
    if exists:
        changed = False
        if not getattr(exists, "name", None):
            exists.name = name
            changed = True
        if not getattr(exists, "is_admin", False):
            exists.is_admin = True
            changed = True
        if os.getenv("ADMIN_RESET_PASSWORD", "").strip().lower() in ("1","true","yes","y"):
            if hasattr(exists, "set_password"):
                exists.set_password(pwd)
            else:
                from werkzeug.security import generate_password_hash
                try:
                    exists.password_hash = generate_password_hash(pwd, method="scrypt")
                except Exception:
                    exists.password_hash = generate_password_hash(pwd)
            changed = True
        if changed:
            db.session.add(exists)
            db.session.commit()
        app.logger.warning("Admin seed: usuário já existia — email=%s, is_admin=%s, name=%s",
                           email, getattr(exists, "is_admin", False), getattr(exists, "name", ""))
        return

    # criar novo
    u = User(
        name=name,
        email=email,
        is_admin=True,
        created_at=datetime.utcnow()
    )
    # senha
    if hasattr(u, "set_password"):
        u.set_password(pwd)
    else:
        from werkzeug.security import generate_password_hash
        try:
            u.password_hash = generate_password_hash(pwd, method="scrypt")
        except Exception:
            u.password_hash = generate_password_hash(pwd)

    db.session.add(u)
    db.session.commit()
    app.logger.warning("Admin seed: criado com sucesso — email=%s, senha=<oculta>, name=%s",
                       email, name)
