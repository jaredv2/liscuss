import { Link } from "react-router-dom";
import { CommentFeed } from "../components/CommentFeed";
import { CommentInput } from "../components/CommentInput";
import { Credits } from "../components/Credits";
import { NowPlaying } from "../components/NowPlaying";
import { PollingStatus } from "../components/PollingStatus";
import { TrackActions } from "../components/TrackActions";
import { useComments } from "../hooks/useComments";
import { useNowPlaying } from "../hooks/useNowPlaying";
import { useActiveListeners } from "../hooks/useActiveListeners";
import { clearSupabaseJwt, getLastfmUsername } from "../lib/supabase";

export function Home() {
  const username = getLastfmUsername();
  const { track, loading: trackLoading, error: trackError, pollingStatus, lastCheckedAt, nextCheckAt, refresh } = useNowPlaying(username);
  const { comments, loading: commentsLoading, error: commentsError, reload, toggleLike, editComment, deleteComment } = useComments(track?.id ?? null);
  const { currentlyListening } = useActiveListeners(track?.id ?? null);

  function logout() {
    clearSupabaseJwt();
    window.location.assign("/");
  }

  if (!username) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center sm:p-6">
          <h1 className="text-2xl font-bold text-white">Login required</h1>
          <Link className="mt-4 inline-flex rounded-full bg-lastfm px-5 py-2 text-sm font-semibold text-white" to="/">
            Login with Last.fm
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-3 py-4 sm:px-6 sm:py-8">
      <header className="sticky top-0 z-20 -mx-3 mb-4 border-b border-white/10 bg-ink/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:mb-8 sm:border-b-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="flex items-center justify-between gap-3">
          <Link className="truncate text-lg font-extrabold tracking-tight text-white sm:text-xl" to="/">
            Scrobble Comments
          </Link>
          <div className="flex items-center gap-2">
            <Link className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-lastfm/60 hover:text-red-100" to="/profile">
              Profile
            </Link>
            <button className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-lastfm/60 hover:text-red-100" type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
        <p className="mt-1 truncate text-xs text-zinc-500 sm:text-sm">@{username}</p>
      </header>

      <div className="space-y-3 sm:space-y-5">
        {trackLoading ? <p className="text-sm text-zinc-500">Loading now playing...</p> : null}
        {trackError ? <p className="text-sm text-red-300">{trackError}</p> : null}
        <NowPlaying track={track} commentCount={comments.length} currentlyListening={currentlyListening} />
        {track ? (
          <>
            <CommentInput trackId={track.id} onSubmitted={reload} />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-white">Comments</h2>
              <TrackActions trackId={track.id} />
            </div>
            {commentsLoading ? <p className="text-sm text-zinc-500">Loading comments...</p> : null}
            {commentsError ? <p className="text-sm text-red-300">{commentsError}</p> : null}
            <CommentFeed comments={comments} trackId={track.id} onChanged={reload} onLike={toggleLike} onEdit={editComment} onDelete={deleteComment} />
          </>
        ) : null}
      </div>
      <Credits />
    </main>
  );
}
