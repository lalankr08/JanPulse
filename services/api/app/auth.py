import os
import time
import uuid
from typing import Optional
import jwt
from fastapi import HTTPException, Security, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
from app.config import settings

security = HTTPBearer(auto_error=False)

def get_valid_uuid(val: str) -> str:
    """Ensures user ID string is always a valid UUID for PostgreSQL uuid columns."""
    try:
        return str(uuid.UUID(val))
    except Exception:
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, str(val)))

def verify_jwt(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> dict:
    client_ip = request.client.host if request and request.client else "127.0.0.1"
    anon_user_id = get_valid_uuid(f"anon-{client_ip}")

    # If no token provided, return anonymous citizen session
    if not credentials or not credentials.credentials:
        return {"sub": anon_user_id, "role": "anon", "is_anon": True}

    token = credentials.credentials.strip()
    try:
        # Decode without verification to inspect claims
        unverified = jwt.decode(token, options={"verify_signature": False})
        
        # 1. Project anon key check (Standard Supabase public anon token has role='anon' and no 'sub')
        if unverified.get("role") == "anon" and not unverified.get("sub"):
            return {
                "sub": anon_user_id,
                "role": "anon",
                "is_anon": True,
                "ref": unverified.get("ref", "supabase")
            }

        # 2. If JWT secret is configured, verify with HS256
        if settings.SUPABASE_JWT_SECRET:
            try:
                payload = jwt.decode(
                    token,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    audience="authenticated"
                )
                if "sub" in payload:
                    payload["sub"] = get_valid_uuid(payload["sub"])
                return payload
            except Exception:
                pass

        # 3. User token with subject / user id
        sub_raw = unverified.get("sub") or unverified.get("id") or f"anon-{client_ip}"
        unverified["sub"] = get_valid_uuid(str(sub_raw))
        return unverified

    except jwt.ExpiredSignatureError:
        return {"sub": anon_user_id, "role": "anon", "is_anon": True}
    except Exception as e:
        print(f"[Auth] Token parsing error: {e}. Defaulting to anon session.")
        return {"sub": anon_user_id, "role": "anon", "is_anon": True}
