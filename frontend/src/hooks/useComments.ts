import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Comment } from "../types";

const commentSelect = "id,user_id,track_id,body,timestamp_ms,created_at,profiles:user_id(id,lastfm_username,avatar_url,created_at)";

function sortComments(items: Comment[]): Comment[] {
  return [...items].sort((left, right) => {
    if (left.timestamp_ms === null && right.timestamp_ms !== null) return 1;
    if (left.timestamp_ms !== null && right.timestamp_ms === null) return -1;
    if (left.timestamp_ms !== null && right.timestamp_ms !== null && left.timestamp_ms !== right.timestamp_ms) {
      return left.timestamp_ms - right.timestamp_ms;
    }
    return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
  });
}

export function useComments(trackId: string | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(Boolean(trackId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!trackId) {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("comments")
      .select(commentSelect)
      .eq("track_id", trackId)
      .order("timestamp_ms", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (queryError) {
      setError(queryError.message);
    } else {
      setComments((data ?? []) as unknown as Comment[]);
      setError(null);
    }
    setLoading(false);
  }, [trackId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!trackId) return;

    const channel = supabase
      .channel(`comments:${trackId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `track_id=eq.${trackId}` },
        (payload) => {
          const insertedId = payload.new.id;
          if (typeof insertedId !== "string") {
            void load();
            return;
          }

          void supabase
            .from("comments")
            .select(commentSelect)
            .eq("id", insertedId)
            .single()
            .then(({ data, error: queryError }) => {
              if (queryError || !data) {
                void load();
                return;
              }
              setComments((current) => sortComments([...(current.filter((comment) => comment.id !== insertedId)), data as unknown as Comment]));
            });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, trackId]);

  return { comments, loading, error, reload: load };
}
