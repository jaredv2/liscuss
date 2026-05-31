import { useMemo, useState } from "react";
import { getSupabaseUserId } from "../lib/supabase";
import { formatTimestamp } from "../lib/timestamp";
import { formatNumber } from "../lib/formatNumber";
import type { Comment } from "../types";
import { CommentInput } from "./CommentInput";
import { MarkdownBody } from "./MarkdownBody";

type Props = {
  comments: Comment[];
  trackId: string;
  onLike: (comment: Comment) => Promise<void>;
  onEdit: (commentId: string, body: string) => Promise<boolean>;
  onDelete: (commentId: string) => Promise<void>;
  onChanged: () => void;
};

function avatarInitial(username: string): string {
  return username.slice(0, 1).toUpperCase();
}

function formatCreatedAt(value: string): string {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortByCreatedAt(left: Comment, right: Comment): number {
  return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
}

export function CommentFeed({ comments, trackId, onLike, onEdit, onDelete, onChanged }: Props) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [timestampNotice, setTimestampNotice] = useState<string | null>(null);
  const currentUserId = getSupabaseUserId();

  const { roots, repliesByParent } = useMemo(() => {
    const replies = new Map<string, Comment[]>();
    const topLevel: Comment[] = [];

    for (const comment of comments) {
      if (comment.parent_id) {
        replies.set(comment.parent_id, [...(replies.get(comment.parent_id) ?? []), comment]);
      } else {
        topLevel.push(comment);
      }
    }

    for (const [parentId, parentReplies] of replies) {
      replies.set(parentId, parentReplies.sort(sortByCreatedAt));
    }

    return { roots: topLevel, repliesByParent: replies };
  }, [comments]);

  async function handleTimestampClick(comment: Comment) {
    if (comment.timestamp_ms === null) return;

    const timestamp = formatTimestamp(comment.timestamp_ms);
    await navigator.clipboard.writeText(timestamp).catch(() => undefined);
  }

  function renderComment(comment: Comment, isReply = false) {
    const username = comment.profiles?.lastfm_username ?? "Last.fm user";
    const replies = repliesByParent.get(comment.id) ?? [];
    const isAuthor = currentUserId && comment.user_id === currentUserId;
    const isEditing = editingId === comment.id;

    return (
      <div key={comment.id} className={isReply ? "ml-9 border-l border-white/10 pl-3 sm:ml-12" : ""}>
        <article className="flex gap-2.5 rounded-xl border border-white/10 bg-white/[0.025] p-3 sm:gap-3 sm:p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-xs font-semibold text-zinc-200 sm:h-10 sm:w-10 sm:text-sm">
            {comment.profiles?.avatar_url ? (
              <img className="h-full w-full object-cover" src={comment.profiles.avatar_url} alt={`${username} avatar`} />
            ) : (
              avatarInitial(username)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-white sm:text-base">{username}</p>
                {comment.is_edited && (
                  <span className="text-[10px] text-zinc-500" title="This comment has been edited">(edited)</span>
                )}
              </div>
              <time className="text-xs text-zinc-600" dateTime={comment.created_at}>
                {formatCreatedAt(comment.created_at)}
              </time>
              {comment.timestamp_ms !== null ? (
                <button
                  className="rounded-full bg-lastfm/15 px-2 py-0.5 text-xs font-semibold text-red-200 transition hover:bg-lastfm/30"
                  type="button"
                  onClick={() => void handleTimestampClick(comment)}
                  title="Copy timestamp"
                >
                  {formatTimestamp(comment.timestamp_ms)}
                </button>
              ) : null}
            </div>
            {isEditing ? (
              <div className="mt-2 space-y-2">
                <textarea
                  className="min-h-[80px] w-full resize-none rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-lastfm"
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    className="rounded-full bg-lastfm px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    disabled={!editBody.trim() || editBody === comment.body}
                    onClick={async () => {
                      if (await onEdit(comment.id, editBody.trim())) {
                        setEditingId(null);
                      }
                    }}
                  >
                    Save
                  </button>
                  <button className="text-xs text-zinc-400 hover:text-white" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2 break-words text-sm leading-6 text-zinc-300">
                <MarkdownBody>{comment.body}</MarkdownBody>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  comment.liked_by_me ? "border-lastfm bg-lastfm/15 text-red-100" : "border-white/10 text-zinc-400 hover:border-lastfm/60 hover:text-red-100"
                }`}
                type="button"
                onClick={() => void onLike(comment)}
              >
                {comment.liked_by_me ? "Liked" : "Like"} · {formatNumber(comment.like_count)}
              </button>
              {!isReply ? (
                <button
                  className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-zinc-400 transition hover:border-lastfm/60 hover:text-red-100"
                  type="button"
                  onClick={() => setReplyingTo((current) => (current === comment.id ? null : comment.id))}
                >
                  Reply · {formatNumber(replies.length)}
                </button>
              ) : null}
              {isAuthor && !isEditing && (
                <div className="ml-auto flex items-center gap-3">
                  <button
                    className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 transition hover:text-zinc-200"
                    onClick={() => {
                      setEditingId(comment.id);
                      setEditBody(comment.body);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 transition hover:text-red-400"
                    onClick={() => {
                      if (confirm("Delete this comment? All replies will also be deleted.")) {
                        void onDelete(comment.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </article>

        {replyingTo === comment.id ? (
          <div className="mt-2">
            <CommentInput
              trackId={trackId}
              parentId={comment.id}
              compact
              autoFocus
              onSubmitted={() => {
                setReplyingTo(null);
                onChanged();
              }}
            />
          </div>
        ) : null}

        {replies.length > 0 ? <div className="mt-2 space-y-2">{replies.map((reply) => renderComment(reply, true))}</div> : null}
      </div>
    );
  }

  if (comments.length === 0) {
    return <p className="rounded-xl border border-white/10 p-4 text-sm text-zinc-500 sm:p-5">No comments yet.</p>;
  }

  return (
    <div className="space-y-3">
      {timestampNotice ? <p className="rounded-xl border border-lastfm/30 bg-lastfm/10 p-3 text-xs text-red-100">{timestampNotice}</p> : null}
      {roots.map((comment) => renderComment(comment))}
    </div>
  );
}
