from flask import redirect, url_for
from .shop import shop_bp as _bp

@_bp.get('/pagamento/pix/<int:order_id>')
def pix_alias(order_id):
    return redirect(url_for('shop.pix', order_id=order_id))

@_bp.get('/pagamento/sucesso/<int:order_id>')
def sucesso_alias(order_id):
    return redirect(url_for('shop.sucesso', order_id=order_id))
