import { useCallback } from "react";
import { setSupabaseJwt } from "../lib/supabase";

export function useLastfmAuth() {
  const login = useCallback(async () => {
    const response = await fetch("https://liscuss-backend.vercel.app/api/auth/lastfm/url", { method: "POST" });
    if (!response.ok) {
      throw new Error("Failed to create Last.fm auth URL");
    }
    const { url } = (await response.json()) as { url: string };
    window.location.href = url;
  }, []);

  const completeCallback = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const username = params.get("username");

    if (!token || !username) {
      throw new Error("OAuth callback is missing token or username");
    }

    setSupabaseJwt(token, username);
  }, []);

  return { login, completeCallback };
}
