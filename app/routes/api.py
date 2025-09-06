
import cloudinary
import cloudinary.uploader
from flask import Blueprint, request, jsonify
from ..models import Product
from .. import db
import os

api_bp = Blueprint('api', __name__)

# Cloudinary config
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

@api_bp.post('/products')
def create_product():
    # Admin-lite endpoint: expects multipart with 'image' optional
    name = request.form.get('name')
    price_cents = int(request.form.get('price_cents', '0'))
    description = request.form.get('description', '')
    stock = int(request.form.get('stock', '0'))
    image_url = None
    if 'image' in request.files:
        res = cloudinary.uploader.upload(request.files['image'])
        image_url = res.get('secure_url')
    p = Product(name=name, description=description, price_cents=price_cents, stock=stock, image_url=image_url)
    db.session.add(p)
    db.session.commit()
    return jsonify({'id': p.id}), 201

@api_bp.get('/products')
def list_products_json():
    products = Product.query.filter_by(is_active=True).order_by(Product.created_at.desc()).all()
    return jsonify([{
        'id': p.id, 'name': p.name, 'description': p.description,
        'price_cents': p.price_cents, 'image_url': p.image_url
    } for p in products])
