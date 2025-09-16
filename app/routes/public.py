
from flask import Blueprint, render_template
from ..models import Product
from flask import current_app, Response

public_bp = Blueprint('public', __name__)


@public_bp.get("/")
def home():
    try:
        from app.models import Product
        featured = (Product.query
                    .filter_by(is_active=True)
                    .order_by(Product.created_at.desc())
                    .limit(6).all())
        return render_template("home.html", featured=featured)
    except Exception as e:
        current_app.logger.exception("Falha na home")
        return Response(f"DEBUG 500 -> {type(e).__name__}: {e}", mimetype="text/plain"), 500
    
@public_bp.get('/sobre')
def about():
    return render_template('sobre.html')
