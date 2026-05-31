import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CommentFeed } from "../components/CommentFeed";
import { CommentInput } from "../components/CommentInput";
import { Credits } from "../components/Credits";
import { NowPlaying } from "../components/NowPlaying";
import { useComments } from "../hooks/useComments";
import { authTokenKey, supabase } from "../lib/supabase";
import type { Track } from "../types";

export function TrackPage() {
  const { trackId } = useParams();
  const decodedTrackId = trackId ? decodeURIComponent(trackId) : null;
  const [track, setTrack] = useState<Track | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const { comments, loading, error, reload } = useComments(decodedTrackId);
  const isLoggedIn = Boolean(localStorage.getItem(authTokenKey));

  useEffect(() => {
    if (!decodedTrackId) return;

    async function loadTrack() {
      const { data, error: queryError } = await supabase.from("tracks").select("*").eq("id", decodedTrackId).maybeSingle();
      if (queryError) {
        setTrackError(queryError.message);
      } else {
        setTrack(data as Track | null);
      }
    }

    void loadTrack();
  }, [decodedTrackId]);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <Link className="text-lg font-extrabold tracking-tight text-white sm:text-xl" to="/">
          Scrobble Comments
        </Link>
        <Link className="text-sm font-medium text-lastfm hover:text-red-300" to="/home">
          Home
        </Link>
      </header>
      <div className="space-y-4 sm:space-y-5">
        {trackError ? <p className="text-sm text-red-300">{trackError}</p> : null}
        <NowPlaying track={track} commentCount={comments.length} />
        {isLoggedIn && decodedTrackId ? <CommentInput trackId={decodedTrackId} onSubmitted={reload} /> : null}
        {!isLoggedIn ? <p className="rounded-xl border border-white/10 p-4 text-sm text-zinc-500 sm:p-5">Login to leave a comment.</p> : null}
        {loading ? <p className="text-sm text-zinc-500">Loading comments...</p> : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <CommentFeed comments={comments} />
      </div>
      <Credits />
    </main>
  );
}
