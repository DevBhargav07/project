import sys
import os

# Adds the backend directory to Python path so it can locate the 'app' module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from app.main import app

# Vercel automatically exposes the FastAPI 'app' instance as a serverless function