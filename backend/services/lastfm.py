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
