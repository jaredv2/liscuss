from fastapi import APIRouter, Query

from services.musicbrainz import resolve_track

router = APIRouter(prefix="/tracks", tags=["tracks"])


@router.get("/enrich")
async def enrich_track(artist: str = Query(...), title: str = Query(...)) -> dict:
    return await resolve_track(artist=artist, title=title)
