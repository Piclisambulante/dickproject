
# Placeholder webhook for PIX confirmation if you use a PSP (ex: Mercado Pago/Gerencianet).
# Configure your PSP to call POST /webhook/pix with JSON containing txid or order id.
from flask import Blueprint, request, jsonify
from ..models import Order
from .. import db

webhooks_bp = Blueprint('webhooks', __name__)

@webhooks_bp.post('/pix')
def pix_webhook():
    data = request.get_json(silent=True) or {}
    txid = str(data.get('txid', ''))
    order_id = data.get('order_id')
    order = None
    if order_id:
        order = Order.query.get(order_id)
    elif txid:
        order = Order.query.filter_by(pix_txid=txid).first()
    if not order:
        return jsonify({'ok': False, 'error': 'order_not_found'}), 404
    order.status = 'paid'
    db.session.commit()
    return jsonify({'ok': True})
