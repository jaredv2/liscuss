import { useCallback, useEffect, useState } from "react";
import { getSupabaseUserId, supabase } from "../lib/supabase";
import type { Comment } from "../types";

const commentSelect =
  "id,user_id,track_id,parent_id,body,timestamp_ms,created_at,updated_at,profiles:user_id(id,lastfm_username,avatar_url,created_at),comment_likes(user_id)";

function normalizeComment(comment: Comment, userId: string | null): Comment {
  const likes = comment.comment_likes ?? [];
  const createdAt = new Date(comment.created_at).getTime();
  const updatedAt = comment.updated_at ? new Date(comment.updated_at).getTime() : createdAt;

  return {
    ...comment,
    parent_id: comment.parent_id ?? null,
    comment_likes: likes,
    like_count: likes.length,
    liked_by_me: userId ? likes.some((like) => like.user_id === userId) : false,
    is_edited: updatedAt > createdAt,
  };
}

function normalizeComments(comments: Comment[]): Comment[] {
  const userId = getSupabaseUserId();
  return comments.map((comment) => normalizeComment(comment, userId));
}

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
      setComments(normalizeComments((data ?? []) as unknown as Comment[]));
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
        { event: "*", schema: "public", table: "comments", filter: `track_id=eq.${trackId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as any).id;
            // Optimistically remove the comment and its immediate replies from state
            setComments((current) => current.filter((c) => c.id !== deletedId && c.parent_id !== deletedId));
            return;
          }

          const commentId = (payload.new as any).id;
          if (typeof commentId !== "string") {
            void load();
            return;
          }

          void supabase
            .from("comments")
            .select(commentSelect)
            .eq("id", commentId)
            .single()
            .then(({ data, error: queryError }) => {
              if (queryError || !data) {
                void load();
                return;
              }
              const normalized = normalizeComment(data as unknown as Comment, getSupabaseUserId());
              setComments((current) =>
                sortComments([...current.filter((comment) => comment.id !== commentId), normalized]),
              );
            });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comment_likes" },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, trackId]);

  const toggleLike = useCallback(
    async (comment: Comment) => {
      if (comment.liked_by_me) {
        const { error: unlikeError } = await supabase.from("comment_likes").delete().eq("comment_id", comment.id);
        if (unlikeError) {
          setError(unlikeError.message);
          return;
        }
      } else {
        const { error: likeError } = await supabase.from("comment_likes").insert({ comment_id: comment.id });
        if (likeError) {
          setError(likeError.message);
          return;
        }
      }
      await load();
    },
    [load],
  );

  const postComment = useCallback(
    async (body: string, timestampMs: number | null = null, parentId: string | null = null) => {
      if (!trackId) return;

      const userId = getSupabaseUserId();
      if (!userId) {
        setError("You must be logged in to post a comment");
        return;
      }

      const { error: postError } = await supabase.from("comments").insert({
        user_id: userId,
        track_id: trackId,
        parent_id: parentId,
        body,
        timestamp_ms: timestampMs,
      });

      if (postError) {
        setError(postError.message);
      } else {
        await load();
      }
    },
    [trackId, load],
  );

  const editComment = useCallback(
    async (commentId: string, body: string): Promise<boolean> => {
      const { error: editError } = await supabase
        .from("comments")
        .update({ body, updated_at: new Date().toISOString() })
        .eq("id", commentId);

      if (editError) {
        setError(editError.message);
        return false;
      } else {
        await load();
        return true;
      }
    },
    [load],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      // Note: Ensure the DB has ON DELETE CASCADE on the parent_id column
      const { error: deleteError } = await supabase.from("comments").delete().eq("id", commentId);

      if (deleteError) {
        setError(deleteError.message);
      } else {
        await load();
      }
    },
    [load],
  );

  return { comments, loading, error, reload: load, toggleLike, postComment, editComment, deleteComment };
}
