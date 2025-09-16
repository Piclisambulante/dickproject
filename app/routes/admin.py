
import os, json
import cloudinary, cloudinary.uploader
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from .. import db
from ..models import Product, Order, AuditLog
from ..auth_utils import admin_required


def _to_cents(value: str) -> int:
    """Converts '12.90', '12,90', or '1290' to integer cents.
    Handles both decimal and non-decimal values.
    """
    if value is None:
        return 0
    s = value.strip().replace('R$', '').replace(' ', '').replace(',', '.')
    if '.' not in s:
        s = s + '.00'  # Add decimal point if none present
    try:
        f = float(s)
        return int(round(f * 100))  # convert to cents
    except ValueError:
        return 0  # return 0 if conversion fails
    
    """Converte '12,90' ou '12.90' ou '1290' para centavos (int)."""
    if value is None:
        return 0
    s = value.strip().replace('R$', '').replace(' ', '')
    # Se vier com vírgula decimal brasileira
    if ',' in s and '.' not in s:
        s = s.replace('.', '')  # separadores de mil
        s = s.replace(',', '.')
    try:
        f = float(s)
        return int(round(f * 100))
    except Exception:
        try:
            return int(s)
        except Exception:
            return 0

cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

admin_bp = Blueprint('admin', __name__, template_folder='../templates')

def log(action, target_type, target_id, meta=None):
    db.session.add(AuditLog(user_id=current_user.id if current_user.is_authenticated else None,
                            action=action, target_type=target_type, target_id=str(target_id),
                            meta=json.dumps(meta or {})))
    db.session.commit()

@admin_bp.get('/')
@login_required
@admin_required
def dashboard():
    prod_count = Product.query.count()
    orders_pending = Order.query.filter_by(status='pending').count()
    orders_paid = Order.query.filter_by(status='paid').count()
    latest = Order.query.order_by(Order.created_at.desc()).limit(10).all()
    return render_template('admin/dashboard.html', prod_count=prod_count,
                           orders_pending=orders_pending, orders_paid=orders_paid, latest=latest)

@admin_bp.get('/products')
@login_required
@admin_required
def products_list():
    products = Product.query.order_by(Product.created_at.desc()).all()
    return render_template('admin/products_list.html', products=products)

@admin_bp.get('/products/new')
@login_required
@admin_required
def products_new():
    return render_template('admin/product_form.html', product=None)

@admin_bp.post('/products/new')
@login_required
@admin_required
def products_create():
    name = request.form.get('name')
    price_cents = _to_cents(request.form.get('price_cents') or request.form.get('price') or '0')
    description = request.form.get('description', '')
    stock = int(request.form.get('stock', '0'))
    is_active = bool(request.form.get('is_active'))
    image_url = None
    if 'image' in request.files and request.files['image'].filename:
        res = None
        image_url = None
        try:
            if current_app.config.get('USE_CLOUDINARY'):
                res = cloudinary.uploader.upload(file, folder=os.getenv('CLOUDINARY_FOLDER','products'))
                image_url = res.get('secure_url')
        except Exception as e:
            # fallback para salvar localmente
            import uuid, os
            upload_dir = os.path.join(current_app.root_path, '..', 'static', 'uploads')
            os.makedirs(upload_dir, exist_ok=True)
            fname = f"{uuid.uuid4().hex}_{file.filename}"
            file.save(os.path.join(upload_dir, fname))
            image_url = f"/static/uploads/{fname}"

    p = Product(name=name, description=description, price_cents=price_cents, stock=stock, image_url=image_url, is_active=is_active)
    db.session.add(p)
    db.session.commit()
    log('product_create', 'Product', p.id, {'name': name})
    flash('Produto criado!')
    return redirect(url_for('admin.products_list'))

@admin_bp.get('/products/<int:pid>/edit')
@login_required
@admin_required
def products_edit(pid):
    p = Product.query.get_or_404(pid)
    return render_template('admin/product_form.html', product=p)

@admin_bp.post('/products/<int:pid>/edit')
@login_required
@admin_required
def products_update(pid):
    p = Product.query.get_or_404(pid)
    p.name = request.form.get('name')
    p.description = request.form.get('description', '')
    p.price_cents = _to_cents(request.form.get('price_cents') or request.form.get('price') or '0')
    p.stock = int(request.form.get('stock', '0'))
    p.is_active = bool(request.form.get('is_active'))
    if 'image' in request.files and request.files['image'].filename:
        res = cloudinary.uploader.upload(request.files['image'])
        p.image_url = res.get('secure_url')
    db.session.commit()
    log('product_update', 'Product', p.id, {'name': p.name})
    flash('Produto atualizado.')
    return redirect(url_for('admin.products_list'))

@admin_bp.post('/products/<int:pid>/delete')
@login_required
@admin_required
def products_delete(pid):
    p = Product.query.get_or_404(pid)
    db.session.delete(p)
    db.session.commit()
    log('product_delete', 'Product', pid)
    flash('Produto removido.')
    return redirect(url_for('admin.products_list'))

@admin_bp.get('/orders')
@login_required
@admin_required
def orders_list():
    orders = Order.query.order_by(Order.created_at.desc()).limit(100).all()
    return render_template('admin/orders_list.html', orders=orders)

@admin_bp.post('/orders/<int:oid>/status')
@login_required
@admin_required
def orders_set_status(oid):
    o = Order.query.get_or_404(oid)
    new_status = request.form.get('status')
    if new_status in ('pending','paid','cancelled'):
        o.status = new_status
        db.session.commit()
        log('order_status', 'Order', o.id, {'status': new_status})
        flash('Status atualizado.')
    return redirect(url_for('admin.orders_list'))
