
import os, requests, base64
from flask import Blueprint, render_template, request, redirect, url_for, session, jsonify, flash
from flask_login import current_user, login_required
from ..models import Product, Order, OrderItem
from .. import db
from ..utils import cents_to_brl
from ..pix import build_pix_payload, generate_qr_base64, new_txid

shop_bp = Blueprint('shop', __name__)

def _cart():
    return session.setdefault('cart', {})  # {product_id: quantity}

def _cart_items():
    cart = _cart()
    ids = [int(pid) for pid in cart.keys()]
    products = Product.query.filter(Product.id.in_(ids)).all() if ids else []
    items = []
    total_cents = 0
    for p in products:
        qty = int(cart[str(p.id)])
        line = p, qty, p.price_cents * qty
        total_cents += p.price_cents * qty
        items.append(line)
    return items, total_cents

@shop_bp.get('/cardapio')
def cardapio():
    products = Product.query.filter_by(is_active=True).order_by(Product.created_at.desc()).all()
    return render_template('cardapio.html', products=products)

@shop_bp.post('/cart/add')
def cart_add():
    pid = str(request.form.get('product_id'))
    qty = int(request.form.get('quantity', 1))
    cart = _cart()
    cart[pid] = cart.get(pid, 0) + qty
    session.modified = True
    return redirect(url_for('shop.cart_view'))

@shop_bp.get('/carrinho')
def cart_view():
    items, total_cents = _cart_items()
    # gather name and cep
    name = (current_user.name if current_user.is_authenticated else session.get('guest_name'))
    cep = (current_user.cep if current_user.is_authenticated else session.get('guest_cep'))
    return render_template('carrinho.html', items=items, total_cents=total_cents, name=name, cep=cep)

@shop_bp.post('/carrinho/identificacao')
def cart_identificacao():
    if not current_user.is_authenticated:
        session['guest_name'] = request.form.get('name')
        session['guest_cep'] = request.form.get('cep')
        session.modified = True
    else:
        # if logged, allow updating CEP
        current_user.cep = request.form.get('cep') or current_user.cep
        db.session.commit()
    return redirect(url_for('shop.checkout'))

@shop_bp.get('/checkout')
def checkout():
    items, total_cents = _cart_items()
    if total_cents == 0:
        flash('Seu carrinho está vazio.')
        return redirect(url_for('shop.cardapio'))
    # require name + cep for guests
    if not current_user.is_authenticated and (not session.get('guest_name') or not session.get('guest_cep')):
        flash('Informe seu nome e CEP para continuar.')
        return redirect(url_for('shop.cart_view'))
    return render_template('checkout.html', items=items, total_cents=total_cents)

@shop_bp.post('/checkout/criar-pedido')
def create_order():
    items, total_cents = _cart_items()
    if total_cents == 0:
        return redirect(url_for('shop.cardapio'))
    name = current_user.name if current_user.is_authenticated else session.get('guest_name')
    cep = current_user.cep if current_user.is_authenticated else session.get('guest_cep')
    order = Order(user_id=(current_user.id if current_user.is_authenticated else None),
                  customer_name=name, cep=cep, total_cents=total_cents)
    db.session.add(order)
    db.session.flush()  # get order.id

    for p, qty, line_total in items:
        db.session.add(OrderItem(order_id=order.id, product_id=p.id, quantity=qty, unit_price_cents=p.price_cents))

    # PIX
    amount = total_cents / 100.0
    txid = new_txid()
    payload = build_pix_payload(amount=amount, txid=txid)
    qr_b64 = generate_qr_base64(payload)

    order.pix_txid = txid
    order.pix_payload = payload
    order.pix_qr_url = qr_b64  # storing base64 directly for simplicity
    db.session.commit()

    # Clear cart
    session['cart'] = {}
    session.modified = True

    return redirect(url_for('shop.pix_payment', order_id=order.id))

@shop_bp.get('/pagamento/pix/<int:order_id>')
def pix_payment(order_id):
    order = Order.query.get_or_404(order_id)
    items = order.items
    return render_template('pix.html', order=order, items=items, cents_to_brl=cents_to_brl)

@shop_bp.get('/perfil')
@login_required
def profile():
    orders = Order.query.filter_by(user_id=current_user.id).order_by(Order.created_at.desc()).limit(10).all()
    return render_template('perfil.html', orders=orders)

@shop_bp.get('/historico')
@login_required
def historico():
    # últimos 15 dias do usuário
    from datetime import datetime, timedelta
    since = datetime.utcnow() - timedelta(days=15)
    orders = Order.query.filter(Order.user_id==current_user.id, Order.created_at>=since).order_by(Order.created_at.desc()).all()
    return render_template('historico.html', orders=orders)

# Simple JSON endpoint for frontend widgets
@shop_bp.get('/api/order-status/<int:order_id>')
def order_status(order_id):
    order = Order.query.get_or_404(order_id)
    return jsonify({'id': order.id, 'status': order.status})
