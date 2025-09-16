import json
from flask import Blueprint, request, jsonify
from .. import db
from ..models import Order

# Em create_app() você já faz: app.register_blueprint(webhooks_bp, url_prefix="/webhook")
webhooks_bp = Blueprint("webhooks", __name__)

@webhooks_bp.route("/pix", methods=["POST"])
def webhook_pix():
    """
    Marca pedido como pago a partir de payloads comuns de PSP.
    """
    payload = request.get_json(silent=True) or {}

    # por order_id explícito
    oid = payload.get("order_id") or payload.get("orderId") or payload.get("id_pedido")
    if oid:
        o = Order.query.get(int(oid))
        if o and (payload.get("status","").lower() in
                  ("paid","approved","concluido","concluído","succeeded","success")):
            o.status = "paid"
            db.session.commit()
            return jsonify({"ok": True, "by": "order_id"}), 200

    # por txid
    txid = payload.get("txid") or payload.get("transaction_id") or payload.get("data", {}).get("txid")
    if not txid and isinstance(payload.get("pix"), list) and payload["pix"]:
        txid = payload["pix"][0].get("txid")
        status = (payload["pix"][0].get("status") or "").lower()
        if txid:
            o = Order.query.filter_by(pix_txid=txid).first()
            if o and status in ("paid","approved","concluido","concluído","succeeded","success"):
                o.status = "paid"
                db.session.commit()
                return jsonify({"ok": True, "by": "pix_list"}), 200

    if txid:
        o = Order.query.filter_by(pix_txid=txid).first()
        if o and (payload.get("status") or payload.get("data", {}).get("status") or "").lower() in \
                ("paid","approved","concluido","concluído","succeeded","success"):
            o.status = "paid"
            db.session.commit()
            return jsonify({"ok": True, "by": "txid"}), 200

    # OK para não gerar reenvio em loop
    return jsonify({"ok": True, "note": "payload nao reconhecido"}), 200

# >>> TESTE local SEM CSRF: aceita GET e POST
@webhooks_bp.route("/pix/test/mark-paid/<int:order_id>", methods=["GET", "POST"])
def test_mark_paid(order_id):
    o = Order.query.get_or_404(order_id)
    o.status = "paid"
    db.session.commit()
    return jsonify({"ok": True, "order_id": o.id, "status": o.status})
