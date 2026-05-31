import hashlib
import os
from urllib.parse import urlencode

import httpx
from dotenv import load_dotenv

load_dotenv()

LASTFM_API_ROOT = "https://ws.audioscrobbler.com/2.0/"
LASTFM_AUTH_ROOT = "https://www.last.fm/api/auth/"


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def _api_signature(params: dict[str, str]) -> str:
    secret = _required_env("LASTFM_SECRET")
    payload = "".join(f"{key}{params[key]}" for key in sorted(params))
    return hashlib.md5(f"{payload}{secret}".encode("utf-8")).hexdigest()


def build_auth_url() -> str:
    query = urlencode(
        {
            "api_key": _required_env("LASTFM_API_KEY"),
            "cb": _required_env("LASTFM_CALLBACK_URL"),
        }
    )
    return f"{LASTFM_AUTH_ROOT}?{query}"


async def exchange_token_for_session(token: str) -> dict:
    params = {
        "method": "auth.getSession",
        "api_key": _required_env("LASTFM_API_KEY"),
        "token": token,
    }
    params["api_sig"] = _api_signature(params)
    request_params = {**params, "format": "json"}

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(LASTFM_API_ROOT, params=request_params)
        response.raise_for_status()
        payload = response.json()

    if "session" not in payload:
        raise RuntimeError(payload.get("message", "Last.fm session exchange failed"))

    return payload["session"]


async def get_user_info(username: str) -> dict:
    """Fetch user info from Last.fm, including avatar URL."""
    params = {
        "method": "user.getInfo",
        "api_key": _required_env("LASTFM_API_KEY"),
        "user": username,
        "format": "json",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(LASTFM_API_ROOT, params=params)
        response.raise_for_status()
        payload = response.json()

    if "user" not in payload:
        raise RuntimeError(payload.get("message", "Failed to fetch Last.fm user info"))

    user_data = payload["user"]
    
    # Extract the largest available image
    avatar_url = None
    if "image" in user_data and isinstance(user_data["image"], list) and user_data["image"]:
        # Last.fm returns images with size: small, medium, large, extralarge
        for img in reversed(user_data["image"]):
            if img.get("size") in ("extralarge", "large", "medium"):
                url = img.get("#text", "").strip()
                if url:
                    avatar_url = url
                    break

    return {
        "username": user_data.get("name"),
        "avatar_url": avatar_url,
        "playcount": user_data.get("playcount"),
    }


async def get_user_top_tracks(username: str, limit: int = 10, period: str = "overall") -> list[dict]:
    """Fetch top tracks for a user from Last.fm."""
    params = {
        "method": "user.getTopTracks",
        "api_key": _required_env("LASTFM_API_KEY"),
        "user": username,
        "period": period,
        "limit": str(limit),
        "format": "json",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(LASTFM_API_ROOT, params=params)
        response.raise_for_status()
        payload = response.json()

    if "toptracks" not in payload:
        return []

    tracks = payload["toptracks"].get("track", [])
    if not isinstance(tracks, list):
        tracks = [tracks] if tracks else []

    result = []
    for track in tracks:
        result.append({
            "rank": track.get("@attr", {}).get("rank"),
            "name": track.get("name"),
            "artist": track.get("artist", {}).get("name") if isinstance(track.get("artist"), dict) else track.get("artist"),
            "playcount": int(track.get("playcount", 0)),
            "url": track.get("url"),
        })

    return result
