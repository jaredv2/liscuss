import { MarkdownBody } from "./MarkdownBody";
import { formatTimestamp } from "../lib/timestamp";
import type { Comment } from "../types";

type Props = {
  comments: Comment[];
};

function avatarInitial(username: string): string {
  return username.slice(0, 1).toUpperCase();
}

export function CommentFeed({ comments }: Props) {
  if (comments.length === 0) {
    return <p className="rounded-xl border border-white/10 p-4 text-sm text-zinc-500 sm:p-5">No comments yet.</p>;
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => {
        const username = comment.profiles?.lastfm_username ?? "Last.fm user";
        return (
          <article key={comment.id} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3 sm:p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-sm font-semibold text-zinc-200 sm:h-10 sm:w-10">
              {comment.profiles?.avatar_url ? (
                <img className="h-full w-full object-cover" src={comment.profiles.avatar_url} alt={`${username} avatar`} />
              ) : (
                avatarInitial(username)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-white">{username}</p>
                {comment.timestamp_ms !== null ? (
                  <span className="rounded-full bg-lastfm/15 px-2 py-0.5 text-xs font-semibold text-red-200">
                    {formatTimestamp(comment.timestamp_ms)}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 break-words text-sm leading-6 text-zinc-300">
                <MarkdownBody>{comment.body}</MarkdownBody>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
