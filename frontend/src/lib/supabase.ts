import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required");
}

export const authTokenKey = "scrobble-comments.jwt";
export const usernameKey = "scrobble-comments.lastfm_username";

export function getSupabaseJwt(): string | null {
  return localStorage.getItem(authTokenKey);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => getSupabaseJwt(),
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export function setSupabaseJwt(token: string, username: string): void {
  localStorage.setItem(authTokenKey, token);
  localStorage.setItem(usernameKey, username);
  supabase.realtime.setAuth(token);
}

export function getLastfmUsername(): string | null {
  return localStorage.getItem(usernameKey);
}

export function clearSupabaseJwt(): void {
  localStorage.removeItem(authTokenKey);
  localStorage.removeItem(usernameKey);
  supabase.realtime.setAuth();
}

const existingToken = getSupabaseJwt();
if (existingToken) {
  supabase.realtime.setAuth(existingToken);
}
