import os
import cloudinary

def init_cloudinary():
    # modo: auto (tenta cloudinary e cai para local), on (força cloudinary), off (local)
    mode = os.getenv("CLOUDINARY_MODE","auto").lower()
    if mode == "off":
        return False

    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")

    if not (cloud_name and api_key and api_secret):
        if mode == "on":
            raise RuntimeError("Cloudinary ON, mas credenciais faltando.")
        return False

    cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret, secure=True)
    return True
