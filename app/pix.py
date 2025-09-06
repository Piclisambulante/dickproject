
import qrcode, io, base64, os, random, string

# Simple BR Code (PIX) payload builder based on EMV® spec for PIX
# This generates a dynamic payload with txid (but without PSP API). It works for receiving payments;
# confirmation must be manual or via PSP webhook if you add one.
def _emv(id, value):
    length = f"{len(value):02d}"
    return f"{id}{length}{value}"

def build_pix_payload(amount, txid, merchant_name=None, merchant_city=None, pix_key=None):
    # IDs based on the PIX BR Code spec
    payload_format_indicator = _emv("00", "01")
    point_of_initiation_method = _emv("01", "12")  # 12 = dynamic

    gui = _emv("00", "br.gov.bcb.pix")
    key = _emv("01", (pix_key or os.getenv("PIX_KEY", "")))
    info = _emv("26", gui + key)

    merchant_name = (merchant_name or os.getenv("PIX_MERCHANT_NAME", "Loja")).strip()[:25]
    merchant_city = (merchant_city or os.getenv("PIX_MERCHANT_CITY", "Cidade")).strip()[:15]

    merchant_account_info = info
    category_code = _emv("52", "0000")
    currency = _emv("53", "986")  # BRL
    amount_str = f"{amount:.2f}"
    amount_field = _emv("54", amount_str)
    country_code = _emv("58", "BR")
    name_field = _emv("59", merchant_name)
    city_field = _emv("60", merchant_city)
    txid_field = _emv("62", _emv("05", txid[:25]))  # max 25

    # CRC placeholder
    base = payload_format_indicator + point_of_initiation_method + merchant_account_info + category_code + currency + amount_field + country_code + name_field + city_field + txid_field
    crc = _crc16(base + "6304")
    payload = base + _emv("63", crc)
    return payload

# CRC16-CCITT (0x1021) per spec
def _crc16(data: str):
    crc = 0xFFFF
    for ch in data.encode('ascii'):
        crc ^= ch << 8
        for _ in range(8):
            if (crc & 0x8000):
                crc = (crc << 1) ^ 0x1021
            else:
                crc <<= 1
            crc &= 0xFFFF
    return f"{crc:04X}"

def generate_qr_base64(payload: str):
    qr = qrcode.QRCode(version=4, box_size=10, border=2)
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return "data:image/png;base64," + b64

def new_txid():
    import secrets
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(20))
