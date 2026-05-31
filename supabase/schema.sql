create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  lastfm_username text unique not null,
  lastfm_session_key text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.tracks (
  id text primary key,
  artist text not null,
  title text not null,
  album text,
  album_art_url text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  track_id text not null references public.tracks(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  timestamp_ms int check (timestamp_ms is null or timestamp_ms >= 0),
  created_at timestamptz not null default now()
);

create index if not exists comments_track_id_idx on public.comments(track_id);
create index if not exists comments_timestamp_ms_idx on public.comments(timestamp_ms);
create index if not exists comments_track_timestamp_created_idx on public.comments(track_id, timestamp_ms, created_at);

alter table public.profiles enable row level security;
alter table public.tracks enable row level security;
alter table public.comments enable row level security;

drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles are publicly readable"
on public.profiles for select
using (true);

drop policy if exists "tracks are publicly readable" on public.tracks;
create policy "tracks are publicly readable"
on public.tracks for select
using (true);

drop policy if exists "authenticated users can insert tracks" on public.tracks;
create policy "authenticated users can insert tracks"
on public.tracks for insert
to authenticated
with check (true);

drop policy if exists "authenticated users can update tracks" on public.tracks;
create policy "authenticated users can update tracks"
on public.tracks for update
to authenticated
using (true)
with check (true);

drop policy if exists "comments are publicly readable" on public.comments;
create policy "comments are publicly readable"
on public.comments for select
using (true);

drop policy if exists "users can insert own comments" on public.comments;
create policy "users can insert own comments"
on public.comments for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "users can delete own comments" on public.comments;
create policy "users can delete own comments"
on public.comments for delete
to authenticated
using (user_id = auth.uid());

alter publication supabase_realtime add table public.comments;
