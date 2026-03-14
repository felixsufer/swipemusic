-- SwipeMusic Supabase Schema Setup
-- Run this SQL in the Supabase SQL Editor once to create tables and policies

-- User profiles (auto-created on first login)
create table public.user_profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.user_profiles enable row level security;

create policy "Users can read own profile" on public.user_profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.user_profiles for update using (auth.uid() = id);

-- Liked tracks
create table public.liked_tracks (
  id bigserial primary key,
  user_id uuid references auth.users on delete cascade not null,
  track_id text not null,
  track_data jsonb not null,
  liked_at timestamptz default now(),
  unique(user_id, track_id)
);

alter table public.liked_tracks enable row level security;

create policy "Users can manage own liked tracks" on public.liked_tracks for all using (auth.uid() = user_id);

-- Skipped tracks
create table public.skipped_tracks (
  id bigserial primary key,
  user_id uuid references auth.users on delete cascade not null,
  track_id text not null,
  skipped_at timestamptz default now(),
  unique(user_id, track_id)
);

alter table public.skipped_tracks enable row level security;

create policy "Users can manage own skipped tracks" on public.skipped_tracks for all using (auth.uid() = user_id);
