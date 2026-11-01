import io
from groq import Groq
from app.config import settings

def transcribe_audio(audio_bytes: bytes, filename: str = "audio.wav", language: str = "en") -> dict:
    if not settings.GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not configured")
        
    client = Groq(api_key=settings.GROQ_API_KEY)
    file_tuple = (filename, io.BytesIO(audio_bytes), "audio/wav")
    
    # Pass language hint (hi, en, ta, te, bn, mr)
    transcription = client.audio.transcriptions.create(
        file=file_tuple,
        model=settings.GROQ_STT_MODEL,
        language=language if language != "auto" else None,
        temperature=0.0
    )
    
    return {
        "text": transcription.text,
        "language": language
    }

