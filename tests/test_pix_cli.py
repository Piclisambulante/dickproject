import os, importlib.util

PIX_PATH = r"/mnt/data/workdir2/dickpintu_project_cloudinary_pix_fix/app/pix.py"
spec = importlib.util.spec_from_file_location("pix_mod", PIX_PATH)
pix_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pix_mod)

os.environ.setdefault("PIX_KEY","123e4567-e89b-12d3-a456-426614174000")
os.environ.setdefault("PIX_KEY_TYPE","EVP")
os.environ.setdefault("PIX_MERCHANT_NAME","ZEZINHO")
os.environ.setdefault("PIX_MERCHANT_CITY","BLUMENAU")

p = pix_mod.build_pix_payload(amount=24.00, txid="***")
print("PAYLOAD:", p[:120]+"...")
info = pix_mod._parse_brcode(p)
print("PARSED:", info)
assert info["26-00"]=="br.gov.bcb.pix"
assert info["26-01"]==os.environ["PIX_KEY"]
assert info["53"]=="986"
assert info["59"]=="ZEZINHO"
assert info["60"]=="BLUMENAU"
assert info["62-05"]=="***"
print("OK")
