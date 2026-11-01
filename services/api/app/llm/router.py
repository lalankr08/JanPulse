import os
import json
import time
from typing import Type, TypeVar, Optional, Any
from pydantic import BaseModel
from groq import Groq
from google import genai
from google.genai import types
from app.config import settings

T = TypeVar("T", bound=BaseModel)

class ModelRouter:
    def __init__(self):
        self.groq_client = Groq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None
        self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None

    @staticmethod
    def estimate_tokens(text: str, is_indic: bool = False) -> int:
        if not text:
            return 0
        divisor = 1.5 if is_indic else 3.0
        return int(len(text) / divisor)

    def complete_structured(
        self,
        prompt: str,
        system_prompt: str,
        response_model: Type[T],
        preferred_model_tier: str = "main",  # "fast" (gpt-oss-20b) or "main" (gpt-oss-120b)
        is_indic: bool = False
    ) -> tuple[T, str]:
        """
        Runs structured LLM generation with fallback from Groq to Gemini.
        Returns (parsed_pydantic_instance, model_name_used).
        """
        combined_text = system_prompt + "\n" + prompt
        token_estimate = self.estimate_tokens(combined_text, is_indic=is_indic)
        
        # Decide starting provider
        groq_model = settings.GROQ_MODEL_FAST if preferred_model_tier == "fast" else settings.GROQ_MODEL_MAIN
        # If token estimate is very large (> 12,000) or Groq client not configured, route directly to Gemini
        route_to_gemini_first = token_estimate > 12000 or not self.groq_client

        if not route_to_gemini_first and self.groq_client:
            try:
                # Call Groq with strict JSON schema mode
                schema_json = response_model.model_json_schema()
                response = self.groq_client.chat.completions.create(
                    model=groq_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={
                        "type": "json_schema",
                        "json_schema": {
                            "name": response_model.__name__.lower(),
                            "schema": schema_json
                        }
                    },
                    temperature=0.1
                )
                raw_json = response.choices[0].message.content
                parsed = response_model.model_validate_json(raw_json)
                return parsed, groq_model
            except Exception as e:
                print(f"[ModelRouter] Groq {groq_model} failed ({e}), falling back to Gemini...")
                time.sleep(0.5)

        # Fallback to Gemini
        if self.gemini_client:
            try:
                gemini_model = settings.GEMINI_MODEL_LONG
                gemini_prompt = f"{system_prompt}\n\nUser Request:\n{prompt}"
                response = self.gemini_client.models.generate_content(
                    model=gemini_model,
                    contents=gemini_prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=response_model,
                        temperature=0.1
                    )
                )
                parsed = response_model.model_validate_json(response.text)
                return parsed, f"{gemini_model} (fallback)"
            except Exception as e2:
                print(f"[ModelRouter] Gemini fallback failed: {e2}")
                raise RuntimeError(f"Both Groq and Gemini models failed to process request: {e2}")

        raise RuntimeError("No LLM client is configured or reachable")

    def generate_embedding(self, text: str) -> list[float]:
        """
        Generates 768-dim embedding via Gemini.
        """
        if not self.gemini_client:
            raise RuntimeError("Gemini client not configured for embeddings")
        
        response = self.gemini_client.models.embed_content(
            model=settings.GEMINI_EMBED_MODEL,
            contents=text,
            config=types.EmbedContentConfig(output_dimensionality=settings.EMBED_DIM)
        )
        return list(response.embeddings[0].values)

    def extract_image_text(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
        """
        Uses Gemini 3.8 Flash multimodal vision to extract text, claims, and circular details
        from an uploaded image or screenshot.
        """
        if not self.gemini_client:
            raise RuntimeError("Gemini client not configured for multimodal vision")
        
        prompt = (
            "You are an expert OCR and civic document analyst for Indian public records and social forwards.\n"
            "Examine this image (which could be a WhatsApp forward screenshot, viral social post, "
            "government circular/poster, news clipping, or infographic).\n"
            "Extract all text verbatim, including headlines, scheme names, claims, dates, and amounts.\n"
            "If it contains a claim or viral forward, output the clean extracted text and main claim clearly.\n"
            "Do not add commentary. Return the extracted text."
        )
        part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        
        models_to_try = [settings.GEMINI_MODEL_LONG, "models/gemini-2.5-flash", "gemini-2.5-flash"]
        last_err = None
        for model_name in models_to_try:
            for attempt in range(2):
                try:
                    response = self.gemini_client.models.generate_content(
                        model=model_name,
                        contents=[part, prompt]
                    )
                    return (response.text or "").strip()
                except Exception as e:
                    last_err = e
                    print(f"[ModelRouter] OCR attempt with {model_name} failed ({e}), retrying...")
                    time.sleep(1.2)

        raise RuntimeError(f"Multimodal OCR vision failed across retries: {last_err}")

router = ModelRouter()
