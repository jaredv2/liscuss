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

create table if not exists public.active_listens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  track_id text not null references public.tracks(id) on delete cascade,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, track_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  track_id text not null references public.tracks(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  timestamp_ms int check (timestamp_ms is null or timestamp_ms >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.comments add column if not exists parent_id uuid references public.comments(id) on delete cascade;
alter table public.comments add column if not exists updated_at timestamptz;

create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists comments_track_id_idx on public.comments(track_id);
create index if not exists comments_timestamp_ms_idx on public.comments(timestamp_ms);
create index if not exists comments_track_timestamp_created_idx on public.comments(track_id, timestamp_ms, created_at);
create index if not exists comments_parent_id_idx on public.comments(parent_id);
create index if not exists comment_likes_user_id_idx on public.comment_likes(user_id);
create index if not exists active_listens_track_id_idx on public.active_listens(track_id);
create index if not exists active_listens_updated_at_idx on public.active_listens(updated_at);

alter table public.profiles enable row level security;
alter table public.tracks enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.active_listens enable row level security;

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
with check (
  user_id = auth.uid()
  and (
    parent_id is null
    or exists (
      select 1
      from public.comments parent
      where parent.id = parent_id
        and parent.track_id = track_id
    )
  )
);

drop policy if exists "users can delete own comments" on public.comments;
create policy "users can delete own comments"
on public.comments for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "comment likes are publicly readable" on public.comment_likes;
create policy "comment likes are publicly readable"
on public.comment_likes for select
using (true);

drop policy if exists "users can like comments" on public.comment_likes;
create policy "users can like comments"
on public.comment_likes for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "users can unlike comments" on public.comment_likes;
create policy "users can unlike comments"
on public.comment_likes for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "active_listens are publicly readable" on public.active_listens;
create policy "active_listens are publicly readable"
on public.active_listens for select
using (true);

drop policy if exists "users can track own listening" on public.active_listens;
create policy "users can track own listening"
on public.active_listens for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "users can update own listening" on public.active_listens;
create policy "users can update own listening"
on public.active_listens for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "users can delete own listening" on public.active_listens;
create policy "users can delete own listening"
on public.active_listens for delete
to authenticated
using (user_id = auth.uid());

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'comments'
  ) then
    alter publication supabase_realtime add table public.comments;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'comment_likes'
  ) then
    alter publication supabase_realtime add table public.comment_likes;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'active_listens'
  ) then
    alter publication supabase_realtime add table public.active_listens;
  end if;
end $$;
