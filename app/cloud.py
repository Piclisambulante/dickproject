import os, cloudinary
from dotenv import load_dotenv

def configure_cloudinary_from_env():
    load_dotenv()
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key    = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")
    secure     = str(os.getenv("CLOUDINARY_SECURE", "true")).lower() == "true"

    if not (cloud_name and api_key and api_secret):
        raise RuntimeError("Cloudinary não configurado: defina CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET")

    cloudinary.config(
        cloud_name = cloud_name,
        api_key    = api_key,
        api_secret = api_secret,
        secure     = secure,
    )
