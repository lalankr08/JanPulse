import re
import io
from groq import Groq
from app.config import settings

def chunk_text_for_speech(text: str, max_chars: int = 180) -> list[str]:
    # Split text by sentence terminators (. ! ? \n)
    sentences = re.split(r'(?<=[.!?\n])\s+', text)
    chunks = []
    current = ""
    for s in sentences:
        s_clean = s.strip()
        if not s_clean:
            continue
        if len(current) + len(s_clean) > max_chars and current:
            chunks.append(current.strip())
            current = s_clean
        else:
            current = (current + " " + s_clean).strip()
    if current:
        chunks.append(current.strip())
    return chunks

def synthesize_english_speech(text: str) -> bytes:
    """
    Synthesizes English text to speech using Groq's Orpheus model.
    Returns audio bytes.
    """
    if not settings.GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not configured")
        
    client = Groq(api_key=settings.GROQ_API_KEY)
    chunks = chunk_text_for_speech(text)
    
    # Synthesize the first meaningful chunk (or combine)
    target_text = chunks[0] if chunks else text[:180]
    
    # Call Orpheus text to speech
    try:
        response = client.audio.speech.create(
            model=settings.GROQ_TTS_MODEL,
            voice="autumn",
            input=target_text,
            response_format="wav"
        )
        return response.content
    except Exception as e:
        print(f"[TTS] Groq Orpheus speech synthesis failed: {e}")
        raise e

