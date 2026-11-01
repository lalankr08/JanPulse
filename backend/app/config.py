import os
from pathlib import Path
from dotenv import load_dotenv

# Load from backend/.env or root ../.env if present
backend_env = Path(__file__).resolve().parent.parent / ".env"
root_env = Path(__file__).resolve().parent.parent.parent / ".env"

if backend_env.exists():
    load_dotenv(dotenv_path=backend_env)
if root_env.exists():
    load_dotenv(dotenv_path=root_env)
load_dotenv()

class Settings:
    SUPABASE_URI: str = os.getenv("SUPABASE_URI", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://ocrabtnpbkbnbgccvqjr.supabase.co")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")
    
    # API Keys
    GROQ_API_KEY: str = os.getenv("GROQ_API", os.getenv("GROQ_API_KEY", ""))
    GEMINI_API_KEY: str = os.getenv("GEMINI_API", os.getenv("GEMINI_API_KEY", ""))
    DATA_GOV_IN_API_KEY: str = os.getenv("DATA_GOV_IN_API_KEY", "")
    MYSCHEME_API_KEY: str = os.getenv("MYSCHEME_API_KEY", "tYTy5eEhlu9rFjyxuCr7ra7ACp4dv1RH8gWuHTDc")
    
    # Models - Lightweight 8B parameter models for ultra-low token cost and rapid inference
    GROQ_MODEL_MAIN: str = os.getenv("GROQ_MODEL_MAIN", "llama-3.1-8b-instant")
    GROQ_MODEL_FAST: str = os.getenv("GROQ_MODEL_FAST", "llama-3.1-8b-instant")
    GROQ_MODEL_VISION: str = os.getenv("GROQ_MODEL_VISION", "meta-llama/llama-prompt-guard-2-86m")
    GROQ_STT_MODEL: str = os.getenv("GROQ_STT_MODEL", "whisper-large-v3")
    GROQ_TTS_MODEL: str = os.getenv("GROQ_TTS_MODEL", "canopylabs/orpheus-v1-english")
    
    GEMINI_MODEL_LONG: str = os.getenv("GEMINI_MODEL_LONG", "gemini-1.5-flash")
    GEMINI_EMBED_MODEL: str = os.getenv("GEMINI_EMBED_MODEL", "models/gemini-embedding-001")
    EMBED_DIM: int = int(os.getenv("EMBED_DIM", "768"))
    
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001", "https://jan-pulse.vercel.app", "https://janpulse.vercel.app"]

settings = Settings()
