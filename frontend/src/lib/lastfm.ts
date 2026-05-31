import type { NowPlayingTrack } from "../types";

const lastfmApiRoot = "https://ws.audioscrobbler.com/2.0/";
const lastfmApiKey = import.meta.env.VITE_LASTFM_API_KEY as string | undefined;

function requireLastfmKey(): string {
  if (!lastfmApiKey) {
    throw new Error("VITE_LASTFM_API_KEY is required");
  }
  return lastfmApiKey;
}

function largestImage(images: Array<{ size: string; "#text": string }> | undefined): string | null {
  if (!images) {
    return null;
  }

  for (let index = images.length - 1; index >= 0; index -= 1) {
    if (images[index]["#text"]) {
      return images[index]["#text"];
    }
  }

  return null;
}

export async function getNowPlaying(username: string): Promise<NowPlayingTrack | null> {
  const params = new URLSearchParams({
    method: "user.getRecentTracks",
    user: username,
    api_key: requireLastfmKey(),
    format: "json",
    limit: "1",
  });
  const response = await fetch(`${lastfmApiRoot}?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to load Last.fm recent tracks");
  }
  const payload = await response.json();
  const track = payload.recenttracks?.track?.[0];
  if (!track || track["@attr"]?.nowplaying !== "true") {
    return null;
  }

  return {
    artist: track.artist?.["#text"] ?? "",
    title: track.name ?? "",
    album: track.album?.["#text"] || null,
    albumArtUrl: largestImage(track.image),
    durationMs: null,
    mbid: track.mbid || null,
    isNowPlaying: true,
  };
}

export async function getTrackInfo(artist: string, title: string): Promise<Partial<NowPlayingTrack>> {
  const params = new URLSearchParams({
    method: "track.getInfo",
    artist,
    track: title,
    api_key: requireLastfmKey(),
    format: "json",
  });
  const response = await fetch(`${lastfmApiRoot}?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to load Last.fm track info");
  }
  const payload = await response.json();
  return {
    durationMs: payload.track?.duration ? Number(payload.track.duration) : null,
    albumArtUrl: largestImage(payload.track?.album?.image),
    album: payload.track?.album?.title ?? null,
    mbid: payload.track?.mbid || null,
  };
}
