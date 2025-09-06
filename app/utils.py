
from decimal import Decimal

def cents_to_brl(cents):
    return Decimal(cents) / Decimal(100)

def brl_to_cents(amount_str: str) -> int:
    # accepts '10', '10.00', '10,00'
    clean = amount_str.replace("R$", "").replace(" ", "").replace(",", ".")
    return int(round(float(clean) * 100))
