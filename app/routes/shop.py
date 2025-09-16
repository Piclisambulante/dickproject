# app/routes/shop.py
import os, base64
from flask import Blueprint, render_template, request, redirect, url_for, session, jsonify, flash
from flask_login import current_user, login_required
from ..models import Product, Order, OrderItem
from .. import db
from ..utils import cents_to_brl
from ..pix import build_pix_payload, generate_qr_base64, new_txid

shop_bp = Blueprint("shop", __name__)

# ----------------- Helpers -----------------
def _cart():
    return session.setdefault("cart", {})  # {product_id: quantity}

def _cart_items():
    cart = _cart()
    ids = [int(k) for k in cart.keys()]
    products = Product.query.filter(Product.id.in_(ids)).all() if ids else []
    items, total_cents = [], 0
    for p in products:
        qty = int(cart[str(p.id)])
        line_total = p.price_cents * qty
        total_cents += line_total
        items.append((p, qty, line_total))
    return items, total_cents

# ----------------- Catálogo / Carrinho -----------------
@shop_bp.get("/cardapio")
def cardapio():
    products = Product.query.filter_by(is_active=True).order_by(Product.created_at.desc()).all()
    return render_template("cardapio.html", products=products)

@shop_bp.post("/cart/add")
def cart_add():
    pid = str(request.form.get("product_id"))
    qty = int(request.form.get("quantity", 1))
    cart = _cart()
    cart[pid] = cart.get(pid, 0) + qty
    session.modified = True
    return redirect(url_for("shop.cart_view"))

@shop_bp.get("/carrinho")
def cart_view():
    items, total_cents = _cart_items()
    name = (current_user.name if current_user.is_authenticated else session.get("guest_name"))
    cep = (current_user.cep if current_user.is_authenticated else session.get("guest_cep"))
    return render_template("carrinho.html", items=items, total_cents=total_cents, name=name, cep=cep)

@shop_bp.post("/carrinho/identificacao")
def cart_identificacao():
    if not current_user.is_authenticated:
        session["guest_name"] = request.form.get("name")
        session["guest_cep"]  = request.form.get("cep")
        session.modified = True
    else:
        current_user.cep = request.form.get("cep") or current_user.cep
        db.session.commit()
    return redirect(url_for("shop.checkout"))

# ----------------- Checkout / Pedido -----------------
@shop_bp.get("/checkout")
def checkout():
    items, total_cents = _cart_items()
    if total_cents == 0:
        flash("Seu carrinho está vazio.")
        return redirect(url_for("shop.cardapio"))
    # exigir nome/CEP para guest
    if not current_user.is_authenticated and (not session.get("guest_name") or not session.get("guest_cep")):
        flash("Informe seu nome e CEP para continuar.")
        return redirect(url_for("shop.cart_view"))
    return render_template("checkout.html", items=items, total_cents=total_cents)

@shop_bp.post("/checkout/criar-pedido")
def create_order():
    items, total_cents = _cart_items()
    if total_cents == 0:
        return redirect(url_for("shop.cardapio"))

    name = current_user.name if current_user.is_authenticated else session.get("guest_name")
    cep  = current_user.cep  if current_user.is_authenticated else session.get("guest_cep")

    order = Order(
        user_id=(current_user.id if current_user.is_authenticated else None),
        customer_name=name,
        cep=cep,
        total_cents=total_cents,
        status="pending",
    )
    db.session.add(order)
    db.session.flush()  # para obter order.id

    for p, qty, _ in items:
        db.session.add(OrderItem(order_id=order.id, product_id=p.id, quantity=qty, unit_price_cents=p.price_cents))

    # ---- PIX ----
    amount = total_cents / 100.0
    txid = new_txid(order_id=order.id) if "order_id" in new_txid.__code__.co_varnames else new_txid()
    payload = build_pix_payload(amount=amount, txid=txid)
    qr_b64 = generate_qr_base64(payload)

    order.pix_txid   = txid
    order.pix_payload = payload
    # precisa do prefixo data: para o <img src="...">
    order.pix_qr_url = "data:image/png;base64," + qr_b64

    db.session.commit()

    # limpa carrinho
    session["cart"] = {}
    session.modified = True

    return redirect(url_for("shop.pix", order_id=order.id))

# ----------------- PIX / Sucesso -----------------
@shop_bp.get("/checkout/pix/<int:order_id>")
def pix(order_id):
    order = Order.query.get_or_404(order_id)
    return render_template("pix.html", order=order, cents_to_brl=cents_to_brl)

# alias compatível com /pagamento/*
@shop_bp.get("/pagamento/pix/<int:order_id>")
def pix_alias(order_id):
    return redirect(url_for("shop.pix", order_id=order_id))

@shop_bp.get("/checkout/sucesso/<int:order_id>")
def sucesso(order_id):
    order = Order.query.get_or_404(order_id)
    if order.status != "paid":
        # se acessarem sem estar pago, volta para a página do PIX
        return redirect(url_for("shop.pix", order_id=order.id))
    return render_template("pagamento_sucesso.html", order=order)

@shop_bp.get("/pagamento/sucesso/<int:order_id>")
def sucesso_alias(order_id):
    return redirect(url_for("shop.sucesso", order_id=order_id))

# ----------------- Status (polling) -----------------
# ENDPOINT OFICIAL (sem /api/) -> evita conflito com seu api_bp
@shop_bp.get("/order-status/<int:order_id>")
def order_status(order_id):
    o = Order.query.get_or_404(order_id)
    return jsonify({"id": o.id, "status": o.status})

# compatibilidade com versões antigas (se o front chamar /api/order-status)
@shop_bp.get("/api/order-status/<int:order_id>")
def order_status_legacy(order_id):
    return order_status(order_id)
