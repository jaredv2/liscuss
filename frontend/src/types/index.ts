export type Profile = {
  id: string;
  lastfm_username: string;
  avatar_url: string | null;
  created_at: string;
};

export type Track = {
  id: string;
  artist: string;
  title: string;
  album: string | null;
  album_art_url: string | null;
  duration_ms: number | null;
  created_at?: string;
  currently_listening?: number;
};

export type Comment = {
  id: string;
  user_id: string;
  track_id: string;
  parent_id: string | null;
  body: string;
  timestamp_ms: number | null;
  created_at: string;
  updated_at: string | null;
  profiles?: Profile | null;
  comment_likes?: Array<{ user_id: string }>;
  like_count: number;
  liked_by_me: boolean;
  is_edited: boolean;
};

export type NowPlayingTrack = {
  artist: string;
  title: string;
  album: string | null;
  albumArtUrl: string | null;
  durationMs: number | null;
  mbid: string | null;
  isNowPlaying: boolean;
};
