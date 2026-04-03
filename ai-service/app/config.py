# Environment configuration
import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
EXPRESS_API_URL = os.getenv("EXPRESS_API_URL", "http://localhost:5000")
PORT = int(os.getenv("PORT", "8000"))
