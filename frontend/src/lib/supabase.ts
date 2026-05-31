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

export function getSupabaseUserId(): string | null {
  const token = getSupabaseJwt();
  if (!token) {
    return null;
  }

  try {
    const [, payload] = token.split(".");
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const decoded = JSON.parse(atob(padded)) as { sub?: string };
    return decoded.sub ?? null;
  } catch {
    return null;
  }
}

export function hasValidStoredSession(): boolean {
  const token = getSupabaseJwt();
  const username = getLastfmUsername();
  if (!token || !username) {
    return false;
  }

  try {
    const [, payload] = token.split(".");
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const decoded = JSON.parse(atob(padded)) as { exp?: number };
    return typeof decoded.exp === "number" && decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
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
