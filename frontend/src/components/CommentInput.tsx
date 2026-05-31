import { useMemo, useState } from "react";
import { getSupabaseUserId, supabase } from "../lib/supabase";
import { formatTimestamp, parseTimestamp } from "../lib/timestamp";

type Props = {
  trackId: string;
  parentId?: string | null;
  onSubmitted?: () => void;
  compact?: boolean;
  autoFocus?: boolean;
};

export function CommentInput({ trackId, parentId = null, onSubmitted, compact = false, autoFocus = false }: Props) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detectedTimestamp = useMemo(() => parseTimestamp(body), [body]);
  const tooLong = body.length > 1000;

  async function submit() {
    const trimmed = body.trim();
    if (!trimmed || submitting || tooLong) return;

    const userId = getSupabaseUserId();
    if (!userId) {
      setError("You must be logged in to post");
      return;
    }

    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from("comments").insert({
      user_id: userId,
      track_id: trackId,
      parent_id: parentId,
      body: trimmed,
      timestamp_ms: detectedTimestamp,
    });
    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setBody("");
    onSubmitted?.();
  }

  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.03] ${compact ? "p-3" : "p-3 sm:p-4"}`}>
      <textarea
        className={`${compact ? "min-h-20" : "min-h-28"} w-full resize-none rounded-lg border border-white/10 bg-black px-3 py-3 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-lastfm sm:rounded-xl sm:px-4 sm:text-sm`}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={parentId ? "Write a reply..." : "Markdown supported. Add 2:47 or 1:02:11 to tag a moment."}
        autoFocus={autoFocus}
      />
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-zinc-500 sm:text-sm">
          {detectedTimestamp !== null ? <span>Pin {formatTimestamp(detectedTimestamp)} detected</span> : "Markdown supported"}
          <span className={`ml-2 ${tooLong ? "text-red-300" : "text-zinc-600"}`}>{body.length}/1000</span>
          {error ? <span className="ml-3 text-red-300">{error}</span> : null}
        </div>
        <button
          className="w-full rounded-full bg-lastfm px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2"
          type="button"
          disabled={!body.trim() || submitting || tooLong}
          onClick={submit}
        >
          {submitting ? "Posting..." : parentId ? "Post reply" : "Post comment"}
        </button>
      </div>
    </div>
  );
}
