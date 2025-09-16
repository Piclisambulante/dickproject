from flask import Blueprint, jsonify, current_app
from .models import db, Order
from .pix import _parse_brcode

bp = Blueprint("pix_debug", __name__)

@bp.route("/__pix_debug__/last")
def pix_last():
    if not current_app.debug:
        return jsonify({"ok": False, "error": "debug disabled"}), 404
    order = db.session.query(Order).order_by(Order.id.desc()).first()
    if not order or not getattr(order, "pix_payload", None):
        return jsonify({"ok": False, "error": "no payload"}), 404
    parsed = _parse_brcode(order.pix_payload)
    return jsonify({"ok": True, "id": order.id, "fields": parsed, "payload_len": len(order.pix_payload), "payload_head": order.pix_payload[:80] + "..." })
