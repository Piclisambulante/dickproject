
from flask import Blueprint, render_template
from ..models import Product

public_bp = Blueprint('public', __name__)

@public_bp.get('/')
def home():
    featured = Product.query.filter_by(is_active=True).order_by(Product.created_at.desc()).limit(6).all()
    return render_template('home.html', featured=featured)

@public_bp.get('/sobre')
def about():
    return render_template('sobre.html')
