# app/pix.py — BR Code PIX estático com toggles por .env
# - PIX_POI_METHOD=11   -> inclui Tag 01="11" (estático)
# - PIX_POI_METHOD=omit -> omite Tag 01 (estático puro)
# - PIX_FORCE_STATIC_TXID=1 -> força TXID="***" sempre (ignora o TXID passado)
# - TXID padrão "***" (reutilizável)
# - Sanitização nome/cidade (ASCII, UPPER)
# - Loga resumo decodificado (sem expor a chave)

import os, io, re, base64, uuid, unicodedata
from decimal import Decimal, ROUND_HALF_UP
import qrcode

def _tlv(id_: str, value: str) -> str:
    return f"{id_}{len(value):02d}{value}"

def _crc16(payload: str) -> str:
    data = bytearray(payload.encode("utf-8"))
    crc = 0xFFFF
    for b in data:
        crc ^= (b << 8)
        for _ in range(8):
            if (crc & 0x8000) != 0:
                crc = (crc << 1) ^ 0x1021
            else:
                crc <<= 1
            crc &= 0xFFFF
    return f"{crc:04X}"

def _ascii_up(s: str, n: int) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii","ignore").decode()
    s = re.sub(r"[^A-Z0-9 \-\.@+]", "", s.upper()).strip()
    return (s or "LOJA")[:n]

def _sanitize_name(name: str) -> str: return _ascii_up(name, 25)
def _sanitize_city(city: str) -> str: return _ascii_up(city, 15)

def _format_amount(amount) -> str:
    v = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return f"{v:.2f}"

def _normalize_pix_key(pix_key: str) -> str:
    if not pix_key:
        raise ValueError("PIX_KEY não configurado — defina no .env")
    key = pix_key.strip()
    key_type = (os.getenv("PIX_KEY_TYPE","").upper().strip())

    if key_type == "CPF":
        digits = "".join(c for c in key if c.isdigit())
        if len(digits) != 11:
            raise ValueError("PIX_KEY (CPF) inválido — 11 dígitos sem máscara")
        return digits
    if key_type == "EMAIL":
        if "@" not in key:
            raise ValueError("PIX_KEY (EMAIL) inválido — falta '@'")
        return key
    if key_type == "EVP":
        return key
    if key_type == "PHONE":
        digits = "".join(c for c in key if c.isdigit())
        if len(digits) not in (10,11):
            raise ValueError("PIX_KEY (PHONE) inválido — DDD+número (10/11)")
        return "+55" + digits

    # heurística
    if "@" in key: return key
    if key.startswith("+"): return key
    if key.isdigit() and len(key) == 11: return key
    if len(key) >= 32: return key
    return key

def _parse_tlv(s: str):
    out=[]; i=0
    while i<len(s):
        tag=s[i:i+2]; ln=int(s[i+2:i+4]); val=s[i+4:i+4+ln]
        out.append((tag,ln,val)); i+=4+ln
    return out

def _parse_brcode(payload: str):
    top=_parse_tlv(payload); d={t:v for (t,_,v) in top}
    mai={}; add={}
    if "26" in d:
        for t,_,v in _parse_tlv(d["26"]): mai[t]=v
    if "62" in d:
        for t,_,v in _parse_tlv(d["62"]): add[t]=v
    return {
        "00": d.get("00"), "01": d.get("01"),
        "26-00": mai.get("00"), "26-01": mai.get("01"),
        "52": d.get("52"), "53": d.get("53"), "54": d.get("54"),
        "58": d.get("58"), "59": d.get("59"), "60": d.get("60"),
        "62-05": add.get("05"), "63-04": d.get("63"),
    }

def _log_payload(payload: str):
    try:
        from flask import current_app
        p=_parse_brcode(payload); key=p.get("26-01") or ""
        if key:
            if "@" in key:
                user,dom=key.split("@",1); key_mask=(user[:2]+"***@"+dom) if user else "***@"+dom
            elif key.startswith("+"):
                key_mask=key[:5]+"****"+key[-2:]
            else:
                key_mask=key[:3]+"****"+key[-2:]
        else:
            key_mask=""
        current_app.logger.info(
            "PIX | 01=%s | 26-00=%s | 26-01=%s | 53=%s | 54=%s | 59=%s | 60=%s | 62-05=%s | len=%d | head=%s...",
            p.get("01"), p.get("26-00"), key_mask, p.get("53"), p.get("54"),
            p.get("59"), p.get("60"), p.get("62-05"), len(payload), payload[:60]
        )
    except Exception:
        pass

def build_pix_br_code(pix_key: str, merchant_name: str, merchant_city: str, amount, txid: str="***") -> str:
    key=_normalize_pix_key(pix_key)
    name=_sanitize_name(merchant_name); city=_sanitize_city(merchant_city)
    amount_str=_format_amount(amount)

    payload_format=_tlv("00","01")

    # Toggle da Tag 01 via .env
    poi_env=(os.getenv("PIX_POI_METHOD","11") or "11").strip().lower()
    if poi_env in ("omit","none","0","false","no","off"):
        poi_method=""
    else:
        poi_method=_tlv("01","11")  # estático

    # Forçar TXID="***" via .env (ignora o TXID passado)
    if (os.getenv("PIX_FORCE_STATIC_TXID","").strip().lower() in ("1","true","yes","y")):
        txid = "***"

    gui=_tlv("00","br.gov.bcb.pix"); key_tlv=_tlv("01",key)
    merchant_info=_tlv("26", gui+key_tlv)
    mcc=_tlv("52","0000"); currency=_tlv("53","986")
    amount_tlv=_tlv("54",amount_str); country=_tlv("58","BR")
    mname=_tlv("59",name); mcity=_tlv("60",city)

    txid_clean=(txid or "***").upper()
    txid_clean=re.sub(r"[^A-Z0-9\-]","",txid_clean)[:35] or "***"
    txid_tlv=_tlv("05",txid_clean); addl_data=_tlv("62", txid_tlv)

    partial = payload_format + poi_method + merchant_info + mcc + currency + amount_tlv + country + mname + mcity + addl_data
    to_crc = partial + "6304"; crc=_crc16(to_crc)
    brcode = partial + _tlv("63",crc)
    _log_payload(brcode)
    return brcode

def make_qr_base64(payload: str) -> str:
    img=qrcode.make(payload); buf=io.BytesIO(); img.save(buf, format="PNG")
    return "data:image/png;base64,"+base64.b64encode(buf.getvalue()).decode("ascii")

def build_pix_payload(pix_key=None, merchant_name=None, merchant_city=None, amount=None, txid="***")->str:
    if pix_key is None: pix_key=os.getenv("PIX_KEY")
    if merchant_name is None: merchant_name=os.getenv("PIX_MERCHANT_NAME","LOJA")
    if merchant_city is None: merchant_city=os.getenv("PIX_MERCHANT_CITY","CIDADE")
    if amount is None: raise ValueError("amount is required")
    return build_pix_br_code(pix_key, merchant_name, merchant_city, Decimal(str(amount)), txid)

def generate_qr_base64(payload: str) -> str: return make_qr_base64(payload)

def new_txid(prefix: str="DICK", order_id=None)->str:
    base=f"{prefix}-{order_id}" if order_id is not None else prefix
    suffix=uuid.uuid4().hex[:6].upper(); txid=f"{base}-{suffix}".upper(); return txid[:25]

__all__=["build_pix_br_code","make_qr_base64","build_pix_payload","generate_qr_base64","new_txid","_parse_brcode"]
