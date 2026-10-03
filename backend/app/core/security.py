import sqlite3
import httpx
from typing import Optional, Dict, Any
from fastapi import Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, jwk, JWTError

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import AuthException
from app.models import repository

security_scheme = HTTPBearer(auto_error=False)

_cached_jwks: Optional[dict] = None

def get_jwks() -> Optional[dict]:
    global _cached_jwks
    if _cached_jwks:
        return _cached_jwks
    if not settings.CLERK_JWKS_URL:
        return None
    try:
        response = httpx.get(settings.CLERK_JWKS_URL, timeout=5.0)
        if response.status_code == 200:
            _cached_jwks = response.json()
            return _cached_jwks
    except Exception:
        pass
    return None

def verify_token(token: str) -> dict:
    jwks_data = get_jwks()
    if not jwks_data:
        raise AuthException("Authentication service unavailable", "JWKS_UNAVAILABLE")
    
    try:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        key_dict = next((k for k in jwks_data.get("keys", []) if k.get("kid") == kid), None)
        if not key_dict:
            raise AuthException("Invalid token signature key", "TOKEN_INVALID_KEY")
            
        public_key = jwk.construct(key_dict)
        payload = jwt.decode(
            token,
            public_key.to_pem().decode("utf-8"),
            algorithms=["RS256"],
            options={"verify_aud": False}
        )
        return payload
    except JWTError as e:
        raise AuthException("Invalid or expired authentication token", str(e), code="TOKEN_INVALID")

def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    conn: sqlite3.Connection = Depends(get_db)
) -> Dict[str, Any]:
    # 1. Dev auth bypass mode for rapid local development
    if settings.DEV_AUTH_BYPASS and (not credentials or not credentials.credentials):
        dev_id = "user_chemplot_dev"
        return repository.get_or_create_user(conn, dev_id, "researcher@chemplot.lab", "Electrochem Lead")
        
    # 2. Token verification
    if not credentials or not credentials.credentials:
        raise AuthException("Missing Bearer authorization token", code="MISSING_TOKEN")
        
    token = credentials.credentials
    try:
        payload = verify_token(token)
        user_id = payload.get("sub")
        email = payload.get("email") or payload.get("primary_email_address") or f"{user_id}@clerk.user"
        name = payload.get("name") or payload.get("first_name", "Researcher")
        return repository.get_or_create_user(conn, user_id, email, name)
    except AuthException:
        if settings.DEV_AUTH_BYPASS:
            dev_id = "user_chemplot_dev"
            return repository.get_or_create_user(conn, dev_id, "researcher@chemplot.lab", "Electrochem Lead")
        raise
