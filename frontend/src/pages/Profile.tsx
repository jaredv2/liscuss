import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Credits } from "../components/Credits";
import { MarkdownBody } from "../components/MarkdownBody";
import { supabase, getLastfmUsername, clearSupabaseJwt, getSupabaseUserId } from "../lib/supabase";
import { formatNumber } from "../lib/formatNumber";
import type { Profile, Comment } from "../types";

export function Profile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = getSupabaseUserId();
  const currentUsername = getLastfmUsername();
  const viewingUsername = searchParams.get("user") || currentUsername;
  const isOwnProfile = viewingUsername === currentUsername;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [commentCount, setCommentCount] = useState(0);
  const [topSongs, setTopSongs] = useState<Array<{rank: string; name: string; artist: string; playcount: number; url: string}>>([]);
  const [topComments, setTopComments] = useState<(Comment & {track_id: string; track_title?: string; track_artist?: string})[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (!currentUsername && !viewingUsername) {
      navigate("/");
      return;
    }

    async function loadProfile() {
      setLoading(true);
      try {
        // Get profile info
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("lastfm_username", viewingUsername)
          .single();

        if (profileError) {
          setError(profileError.message);
          setLoading(false);
          return;
        }

        setProfile(profileData as Profile);

        // Get top songs from Last.fm
        try {
          const response = await fetch(`/api/users/${encodeURIComponent(viewingUsername)}/top-tracks`);
          if (response.ok) {
            const data = await response.json();
            setTopSongs(data.tracks || []);
          }
        } catch (err) {
          console.error("Failed to fetch top songs:", err);
        }

        // Get user ID for comment queries
        if (profileData.id) {
          // Get comment count
          const { count: commentCountResult, error: commentCountError } = await supabase
            .from("comments")
            .select("id", { count: "exact" })
            .eq("user_id", profileData.id);

          if (!commentCountError && typeof commentCountResult === "number") {
            setCommentCount(commentCountResult);
          }

          // Get top comments (limit 10)
          const { data: comments, error: commentsError } = await supabase
            .from("comments")
            .select("*, tracks:track_id(title, artist)")
            .eq("user_id", profileData.id)
            .order("created_at", { ascending: false })
            .limit(10);

          if (!commentsError && comments) {
            setTopComments(
              comments.map((c: any) => ({
                ...c,
                track_title: c.tracks?.title,
                track_artist: c.tracks?.artist,
              }))
            );
          }
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      }
      setLoading(false);
    }

    void loadProfile();
  }, [viewingUsername, currentUsername, navigate, userId]);

  function logout() {
    clearSupabaseJwt();
    window.location.assign("/");
  }

  if (!currentUsername && !viewingUsername) {
    return null;
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-3 py-4 sm:px-6 sm:py-8">
        <p className="text-sm text-zinc-500">Loading profile...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-3 py-4 sm:px-6 sm:py-8">
      <header className="sticky top-0 z-20 -mx-3 mb-4 border-b border-white/10 bg-ink/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:mb-8 sm:border-b-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="flex items-center justify-between gap-3">
          <Link className="truncate text-lg font-extrabold tracking-tight text-white sm:text-xl" to="/home">
            Scrobble Comments
          </Link>
          <div className="flex items-center gap-3">
            {isOwnProfile && (
              <button
                className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-lastfm/60 hover:text-red-100"
                type="button"
                onClick={logout}
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="space-y-5">
        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        {profile ? (
          <>
            {/* Profile Header */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <div className="flex gap-4 sm:gap-6">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-2xl font-semibold text-zinc-200 sm:h-32 sm:w-32 sm:text-3xl">
                  {profile.avatar_url ? (
                    <img
                      className="h-full w-full object-cover"
                      src={profile.avatar_url}
                      alt={`${profile.lastfm_username} avatar`}
                    />
                  ) : (
                    profile.lastfm_username.slice(0, 1).toUpperCase()
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-lastfm sm:text-sm">Last.fm Username</p>
                    <p className="truncate text-2xl font-bold text-white sm:text-3xl">{profile.lastfm_username}</p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
                    <div>
                      <p className="text-xs text-zinc-500">Comments</p>
                      <p className="mt-1 text-xl font-semibold text-white sm:text-2xl">{formatNumber(commentCount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Member Since</p>
                      <p className="mt-1 text-sm font-semibold text-white sm:text-base">
                        {new Date(profile.created_at).toLocaleDateString([], {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <a
                        href={`https://www.last.fm/user/${profile.lastfm_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded-full bg-lastfm px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                      >
                        View on Last.fm
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setActiveTab("profile")}
                className={`px-4 py-3 text-sm font-semibold transition ${
                  activeTab === "profile"
                    ? "border-b-2 border-lastfm text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab("topsongs")}
                className={`px-4 py-3 text-sm font-semibold transition ${
                  activeTab === "topsongs"
                    ? "border-b-2 border-lastfm text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Top Songs
              </button>
              <button
                onClick={() => setActiveTab("topcomments")}
                className={`px-4 py-3 text-sm font-semibold transition ${
                  activeTab === "topcomments"
                    ? "border-b-2 border-lastfm text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Top Comments
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "profile" && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-white">About Scrobble Comments</h2>
                <p className="mt-3 text-sm text-zinc-400">
                  All profile information comes from Last.fm. To update your profile picture, username, or other details,{" "}
                  <a
                    href={`https://www.last.fm/user/${profile.lastfm_username}/settings/profile`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lastfm hover:text-red-300"
                  >
                    visit Last.fm settings
                  </a>
                  .
                </p>
              </div>
            )}

            {activeTab === "topsongs" && (
              <div className="space-y-3">
                {topSongs.length > 0 ? (
                  topSongs.map((song) => (
                    <a
                      key={`${song.rank}`}
                      href={song.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-white/10 bg-white/[0.03] p-4 transition hover:border-lastfm/60 hover:bg-white/[0.05]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-zinc-500">#{song.rank}</p>
                          <p className="mt-1 truncate text-lg font-semibold text-white">{song.name}</p>
                          <p className="mt-0.5 truncate text-sm text-zinc-400">{song.artist}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-lastfm">{formatNumber(song.playcount)}</p>
                          <p className="text-xs text-zinc-500">plays</p>
                        </div>
                      </div>
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-zinc-400">No top songs data available</p>
                )}
              </div>
            )}

            {activeTab === "topcomments" && (
              <div className="space-y-3">
                {topComments.length > 0 ? (
                  topComments.map((comment) => (
                    <Link
                      key={comment.id}
                      to={`/track/${encodeURIComponent(comment.track_id)}`}
                      className="block rounded-lg border border-white/10 bg-white/[0.03] p-4 transition hover:border-lastfm/60 hover:bg-white/[0.05]"
                    >
                      <p className="text-xs text-zinc-500 sm:text-sm">
                        {comment.track_title} • {comment.track_artist}
                      </p>
                      <div className="mt-2 line-clamp-2 text-sm text-zinc-300">
                        <MarkdownBody>{comment.body}</MarkdownBody>
                      </div>
                      <p className="mt-2 text-xs text-zinc-600">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-zinc-400">No comments yet</p>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>

      <Credits />
    </main>
  );
}
