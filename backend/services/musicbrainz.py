from urllib.parse import quote

import httpx

MUSICBRAINZ_ROOT = "https://musicbrainz.org/ws/2/recording/"
USER_AGENT = "ScrobbleComments/0.1 (https://example.local)"

from dotenv import load_dotenv

load_dotenv()


async def resolve_track(artist: str, title: str) -> dict:
    query = f'artist:"{artist}" AND recording:"{title}"'
    params = {"query": query, "fmt": "json", "limit": "1", "inc": "releases"}
    headers = {"User-Agent": USER_AGENT}

    async with httpx.AsyncClient(timeout=15, headers=headers) as client:
        response = await client.get(MUSICBRAINZ_ROOT, params=params)
        response.raise_for_status()
        payload = response.json()

    recordings = payload.get("recordings", [])
    if not recordings:
        return {
            "id": fallback_track_id(artist, title),
            "mbid": None,
            "artist": artist,
            "title": title,
            "duration_ms": None,
        }

    recording = recordings[0]
    return {
        "id": recording.get("id") or fallback_track_id(artist, title),
        "mbid": recording.get("id"),
        "artist": artist,
        "title": recording.get("title") or title,
        "duration_ms": recording.get("length"),
    }


def fallback_track_id(artist: str, title: str) -> str:
    return f"{quote(artist.strip().lower())}::{quote(title.strip().lower())}"
