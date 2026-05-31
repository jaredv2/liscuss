import os
import time
from urllib.parse import urlencode

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from jose import jwt

from services.lastfm import build_auth_url, exchange_token_for_session, get_user_info

load_dotenv()

router = APIRouter(prefix="/auth/lastfm", tags=["auth"])


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise HTTPException(status_code=500, detail=f"{name} is not configured")
    return value


async def _supabase_request(method: str, path: str, json: dict | None = None, prefer: str = "return=representation") -> dict:
    supabase_url = _required_env("SUPABASE_URL").rstrip("/")
    service_key = _required_env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": prefer,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.request(method, f"{supabase_url}{path}", headers=headers, json=json)

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=response.text)

    if not response.content:
        return {}
    return response.json()


async def _ensure_auth_user(lastfm_username: str) -> str:
    email = f"{lastfm_username.lower()}@lastfm.scrobble-comments.local"
    user_payload = {
        "email": email,
        "email_confirm": True,
        "user_metadata": {"lastfm_username": lastfm_username},
    }

    try:
        created = await _supabase_request("POST", "/auth/v1/admin/users", user_payload)
        return created["id"]
    except HTTPException:
        users = await _supabase_request("GET", f"/auth/v1/admin/users?{urlencode({'email': email})}")
        for user in users.get("users", []):
            if user.get("email") == email:
                return user["id"]
    raise HTTPException(status_code=502, detail="Could not create or find Supabase auth user")


async def _find_profile_user_id(lastfm_username: str) -> str | None:
    profiles = await _supabase_request(
        "GET",
        f"/rest/v1/profiles?{urlencode({'select': 'id', 'lastfm_username': f'eq.{lastfm_username}', 'limit': '1'})}",
    )
    if isinstance(profiles, list) and profiles:
        profile_id = profiles[0].get("id")
        if isinstance(profile_id, str):
            return profile_id
    return None


async def _upsert_profile(user_id: str, username: str, session_key: str, avatar_url: str | None = None) -> None:
    await _supabase_request(
        "POST",
        "/rest/v1/profiles?on_conflict=id",
        {
            "id": user_id,
            "lastfm_username": username,
            "lastfm_session_key": session_key,
            "avatar_url": avatar_url,
        },
        prefer="resolution=merge-duplicates,return=representation",
    )


def _mint_supabase_jwt(user_id: str, username: str) -> str:
    now = int(time.time())
    payload = {
        "aud": "authenticated",
        "exp": now + 60 * 60 * 24 * 7,
        "iat": now,
        "sub": user_id,
        "role": "authenticated",
        "lastfm_username": username,
    }
    return jwt.encode(payload, _required_env("SUPABASE_JWT_SECRET"), algorithm="HS256")


@router.post("/url")
async def lastfm_auth_url() -> dict[str, str]:
    return {"url": build_auth_url()}


@router.get("/callback")
async def lastfm_callback(token: str = Query(...)) -> RedirectResponse:
    try:
        session = await exchange_token_for_session(token)
        username = session["name"]
        session_key = session["key"]
        
        # Fetch user info from Last.fm to get avatar
        user_info = await get_user_info(username)
        avatar_url = user_info.get("avatar_url")
        
        user_id = await _find_profile_user_id(username) or await _ensure_auth_user(username)
        await _upsert_profile(user_id, username, session_key, avatar_url)
        supabase_jwt = _mint_supabase_jwt(user_id, username)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    frontend_url = _required_env("FRONTEND_URL").rstrip("/")
    return RedirectResponse(f"{frontend_url}/callback?{urlencode({'token': supabase_jwt, 'username': username})}")
