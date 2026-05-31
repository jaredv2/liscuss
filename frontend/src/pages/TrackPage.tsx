import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CommentFeed } from "../components/CommentFeed";
import { CommentInput } from "../components/CommentInput";
import { Credits } from "../components/Credits";
import { NowPlaying } from "../components/NowPlaying";
import { TrackActions } from "../components/TrackActions";
import { useComments } from "../hooks/useComments";
import { useActiveListeners } from "../hooks/useActiveListeners";
import { authTokenKey, supabase } from "../lib/supabase";
import type { Track } from "../types";

export function TrackPage() {
  const { trackId } = useParams();
  const decodedTrackId = trackId ? decodeURIComponent(trackId) : null;
  const [track, setTrack] = useState<Track | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const { comments, loading, error, reload, toggleLike, editComment, deleteComment } = useComments(decodedTrackId);
  const { currentlyListening } = useActiveListeners(decodedTrackId);
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
    <main className="mx-auto min-h-screen max-w-4xl px-3 py-4 sm:px-6 sm:py-8">
      <header className="sticky top-0 z-20 -mx-3 mb-4 border-b border-white/10 bg-ink/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:mb-8 sm:border-b-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="flex items-center justify-between gap-3">
          <Link className="truncate text-lg font-extrabold tracking-tight text-white sm:text-xl" to="/">
            Liscuss
          </Link>
          <div className="flex items-center gap-3">
            {isLoggedIn && (
              <Link className="shrink-0 text-sm font-medium text-lastfm hover:text-red-300" to="/profile">
                Profile
              </Link>
            )}
            <Link className="shrink-0 text-sm font-medium text-lastfm hover:text-red-300" to="/home">
              Home
            </Link>
          </div>
        </div>
      </header>
      <div className="space-y-3 sm:space-y-5">
        {trackError ? <p className="text-sm text-red-300">{trackError}</p> : null}
        <NowPlaying track={track} commentCount={comments.length} currentlyListening={currentlyListening} />
        {decodedTrackId ? <TrackActions trackId={decodedTrackId} /> : null}
        {isLoggedIn && decodedTrackId ? <CommentInput trackId={decodedTrackId} onSubmitted={reload} /> : null}
        {!isLoggedIn ? <p className="rounded-xl border border-white/10 p-4 text-sm text-zinc-500 sm:p-5">Login to leave a comment.</p> : null}
        {loading ? <p className="text-sm text-zinc-500">Loading comments...</p> : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {decodedTrackId ? <CommentFeed comments={comments} trackId={decodedTrackId} onChanged={reload} onLike={toggleLike} onEdit={editComment} onDelete={deleteComment} /> : null}
      </div>
      <Credits />
    </main>
  );
}
