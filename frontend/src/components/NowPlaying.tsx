import type { Track } from "../types";

type Props = {
  track: Track | null;
  commentCount: number;
};

export function NowPlaying({ track, commentCount }: Props) {
  if (!track) {
    return (
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <p className="text-sm text-zinc-400">No track is currently scrobbling.</p>
      </section>
    );
  }

  return (
    <section className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:gap-5 sm:p-5">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-900 sm:h-32 sm:w-32 sm:rounded-xl">
        {track.album_art_url ? (
          <img className="h-full w-full object-cover" src={track.album_art_url} alt={`${track.title} artwork`} />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-lastfm sm:text-sm sm:normal-case sm:tracking-normal">Now scrobbling</p>
        <h1 className="mt-1 truncate text-xl font-bold tracking-tight text-white sm:mt-2 sm:text-3xl">{track.title}</h1>
        <p className="mt-0.5 truncate text-sm text-zinc-300 sm:mt-1 sm:text-lg">{track.artist}</p>
        {track.album ? <p className="mt-1 truncate text-xs text-zinc-500 sm:mt-2 sm:text-sm">{track.album}</p> : null}
        <p className="mt-3 text-xs text-zinc-400 sm:mt-5 sm:text-sm">{commentCount} people commented on this track</p>
      </div>
    </section>
  );
}
