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
};

export type Comment = {
  id: string;
  user_id: string;
  track_id: string;
  body: string;
  timestamp_ms: number | null;
  created_at: string;
  profiles?: Profile | null;
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
