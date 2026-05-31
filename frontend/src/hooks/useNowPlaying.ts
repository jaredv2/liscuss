import { useCallback, useEffect, useRef, useState } from "react";
import { getNowPlaying, getTrackInfo } from "../lib/lastfm";
import { supabase } from "../lib/supabase";
import type { NowPlayingTrack, Track } from "../types";

const quickPollMs = 3_000;
const playingPollMs = 12_000;
const stoppedRecentPollMs = 5_000;
const stoppedIdlePollMs = 20_000;
const errorPollMs = 20_000;
const nearEndPollMs = 3_000;
const quickPollCount = 5;
const stoppedRecentWindowMs = 60_000;

type PollingStatus = "checking" | "playing" | "stopped" | "error";

function fallbackTrackId(artist: string, title: string): string {
  return `${encodeURIComponent(artist.trim().toLowerCase())}::${encodeURIComponent(title.trim().toLowerCase())}`;
}

function nowPlayingKey(track: NowPlayingTrack): string {
  return `${track.mbid ?? ""}:${track.artist}:${track.title}`;
}

function clampDelay(delayMs: number, minMs: number, maxMs: number): number {
  return Math.min(maxMs, Math.max(minMs, delayMs));
}

async function toStoredTrack(track: NowPlayingTrack): Promise<Track> {
  const trackInfo = await getTrackInfo(track.artist, track.title).catch(() => null);
  const resolvedId = track.mbid || trackInfo?.mbid || fallbackTrackId(track.artist, track.title);

  return {
    id: resolvedId,
    artist: track.artist,
    title: track.title,
    album: track.album ?? trackInfo?.album ?? null,
    album_art_url: track.albumArtUrl ?? trackInfo?.albumArtUrl ?? null,
    duration_ms: track.durationMs ?? trackInfo?.durationMs ?? null,
  };
}

export function useNowPlaying(username: string | null) {
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(Boolean(username));
  const [error, setError] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<PollingStatus>(username ? "checking" : "stopped");
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [nextCheckAt, setNextCheckAt] = useState<Date | null>(null);
  const lastResolvedKey = useRef<string | null>(null);
  const trackStartedAt = useRef<number | null>(null);
  const currentDurationMs = useRef<number | null>(null);
  const quickPollsRemaining = useRef(quickPollCount);
  const stoppedSince = useRef<number | null>(null);
  const forceRefreshRef = useRef<(() => void) | null>(null);

  const refresh = useCallback(() => {
    forceRefreshRef.current?.();
  }, []);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      return;
    }

    const activeUsername = username;
    let cancelled = false;
    let timeoutId: number | null = null;

    function schedule(delayMs: number) {
      if (cancelled) return;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      setNextCheckAt(new Date(Date.now() + delayMs));
      timeoutId = window.setTimeout(load, delayMs);
    }

    function nextPlayingDelay() {
      if (quickPollsRemaining.current > 0) {
        quickPollsRemaining.current -= 1;
        return quickPollMs;
      }

      if (trackStartedAt.current && currentDurationMs.current) {
        const elapsedMs = Date.now() - trackStartedAt.current;
        const remainingMs = currentDurationMs.current - elapsedMs;
        if (remainingMs <= 0) {
          return nearEndPollMs;
        }
        return clampDelay(remainingMs + 2_000, nearEndPollMs, playingPollMs);
      }

      return playingPollMs;
    }

    function nextStoppedDelay() {
      if (!stoppedSince.current) {
        stoppedSince.current = Date.now();
      }
      const stoppedForMs = Date.now() - stoppedSince.current;
      return stoppedForMs < stoppedRecentWindowMs ? stoppedRecentPollMs : stoppedIdlePollMs;
    }

    async function load() {
      try {
        setPollingStatus("checking");
        setError(null);
        const nowPlaying = await getNowPlaying(activeUsername);
        setLastCheckedAt(new Date());
        if (!nowPlaying) {
          const wasPlaying = lastResolvedKey.current !== null;
          if (wasPlaying) {
            quickPollsRemaining.current = quickPollCount;
          }
          lastResolvedKey.current = null;
          trackStartedAt.current = null;
          currentDurationMs.current = null;
          if (!cancelled) setTrack(null);
          setPollingStatus("stopped");
          schedule(nextStoppedDelay());
          return;
        }
        const currentKey = nowPlayingKey(nowPlaying);
        stoppedSince.current = null;
        if (lastResolvedKey.current === currentKey) {
          setPollingStatus("playing");
          schedule(nextPlayingDelay());
          return;
        }
        trackStartedAt.current = Date.now();
        quickPollsRemaining.current = quickPollCount;
        const storedTrack = await toStoredTrack(nowPlaying);
        await supabase.from("tracks").upsert(storedTrack, { onConflict: "id" });
        lastResolvedKey.current = currentKey;
        currentDurationMs.current = storedTrack.duration_ms;
        if (!cancelled) setTrack(storedTrack);
        setPollingStatus("playing");
        schedule(nextPlayingDelay());
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load now playing");
        setLastCheckedAt(new Date());
        setPollingStatus("error");
        schedule(errorPollMs);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    function checkNow() {
      if (document.visibilityState === "visible") {
        schedule(0);
      }
    }

    forceRefreshRef.current = checkNow;
    window.addEventListener("focus", checkNow);
    document.addEventListener("visibilitychange", checkNow);

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      window.removeEventListener("focus", checkNow);
      document.removeEventListener("visibilitychange", checkNow);
      forceRefreshRef.current = null;
    };
  }, [username]);

  return { track, loading, error, pollingStatus, lastCheckedAt, nextCheckAt, refresh };
}
