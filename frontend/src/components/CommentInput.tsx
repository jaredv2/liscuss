import { useMemo, useState } from "react";
import { formatTimestamp, parseTimestamp } from "../lib/timestamp";
import { supabase } from "../lib/supabase";

type Props = {
  trackId: string;
  onSubmitted?: () => void;
};

export function CommentInput({ trackId, onSubmitted }: Props) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detectedTimestamp = useMemo(() => parseTimestamp(body), [body]);

  async function submit() {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from("comments").insert({
      track_id: trackId,
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
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
      <textarea
        className="min-h-28 w-full resize-none rounded-lg border border-white/10 bg-black px-3 py-3 text-sm text-white outline-none transition focus:border-lastfm sm:rounded-xl sm:px-4"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Leave a markdown comment. Add 2:47 or 1:02:11 to tag a moment."
      />
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-zinc-500">
          {detectedTimestamp !== null ? <span>📍 {formatTimestamp(detectedTimestamp)} detected</span> : "No timestamp detected"}
          {error ? <span className="ml-3 text-red-300">{error}</span> : null}
        </div>
        <button
          className="rounded-full bg-lastfm px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled={!body.trim() || submitting}
          onClick={submit}
        >
          {submitting ? "Posting..." : "Post comment"}
        </button>
      </div>
    </div>
  );
}
