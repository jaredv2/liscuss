import { useEffect, useState } from "react";
import { supabase, getSupabaseUserId } from "../lib/supabase";

export function useActiveListeners(trackId: string | null) {
  const [currentlyListening, setCurrentlyListening] = useState<number>(0);

  useEffect(() => {
    if (!trackId || !getSupabaseUserId()) {
      return;
    }

    // Mark user as listening
    async function startListening() {
      const userId = getSupabaseUserId();
      if (!userId) return;

      await supabase.from("active_listens").upsert({
        user_id: userId,
        track_id: trackId,
        updated_at: new Date().toISOString(),
      });
    }

    // Get initial count
    async function loadCount() {
      const cutoffTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("active_listens")
        .select("id", { count: "exact" })
        .eq("track_id", trackId)
        .gt("updated_at", cutoffTime);

      if (!error && data) {
        setCurrentlyListening(data.length);
      }
    }

    void startListening();
    void loadCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`listeners:${trackId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "active_listens",
          filter: `track_id=eq.${trackId}`,
        },
        () => {
          void loadCount();
        }
      )
      .subscribe();

    // Heartbeat to keep the entry alive
    const heartbeatInterval = setInterval(async () => {
      const userId = getSupabaseUserId();
      if (!userId) return;

      await supabase
        .from("active_listens")
        .update({ updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("track_id", trackId);
    }, 30000); // Update every 30 seconds

    return () => {
      clearInterval(heartbeatInterval);
      void supabase.removeChannel(channel);
      // Clean up when component unmounts
      const userId = getSupabaseUserId();
      if (userId) {
        void supabase
          .from("active_listens")
          .delete()
          .eq("user_id", userId)
          .eq("track_id", trackId);
      }
    };
  }, [trackId]);

  return { currentlyListening };
}
