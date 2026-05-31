import { Link } from "react-router-dom";
import { CommentFeed } from "../components/CommentFeed";
import { CommentInput } from "../components/CommentInput";
import { Credits } from "../components/Credits";
import { NowPlaying } from "../components/NowPlaying";
import { useComments } from "../hooks/useComments";
import { useNowPlaying } from "../hooks/useNowPlaying";
import { getLastfmUsername } from "../lib/supabase";

export function Home() {
  const username = getLastfmUsername();
  const { track, loading: trackLoading, error: trackError } = useNowPlaying(username);
  const { comments, loading: commentsLoading, error: commentsError, reload } = useComments(track?.id ?? null);

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
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <Link className="text-lg font-extrabold tracking-tight text-white sm:text-xl" to="/">
          Scrobble Comments
        </Link>
        <p className="text-sm text-zinc-500">@{username}</p>
      </header>

      <div className="space-y-4 sm:space-y-5">
        {trackLoading ? <p className="text-sm text-zinc-500">Loading now playing...</p> : null}
        {trackError ? <p className="text-sm text-red-300">{trackError}</p> : null}
        <NowPlaying track={track} commentCount={comments.length} />
        {track ? (
          <>
            <CommentInput trackId={track.id} onSubmitted={reload} />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-white">Comments</h2>
              <Link className="text-sm font-medium text-lastfm hover:text-red-300" to={`/track/${encodeURIComponent(track.id)}`}>
                Public track page
              </Link>
            </div>
            {commentsLoading ? <p className="text-sm text-zinc-500">Loading comments...</p> : null}
            {commentsError ? <p className="text-sm text-red-300">{commentsError}</p> : null}
            <CommentFeed comments={comments} />
          </>
        ) : null}
      </div>
      <Credits />
    </main>
  );
}
