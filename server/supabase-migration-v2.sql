-- SwipeSound v2 Migration
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/gnwthbculpograhldphi/sql

-- Track events table — stores all user interactions
CREATE TABLE IF NOT EXISTS track_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  track_id text NOT NULL,
  track_data jsonb, -- full track object snapshot
  event_type text NOT NULL CHECK (event_type IN (
    'impression', 'play_start', 'play_10s', 'like', 'skip',
    'blacklist', 'save_crate', 'open_source', 'undo'
  )),
  mode text, -- trending, genre, recommendations
  genre text,
  created_at timestamptz DEFAULT now()
);

-- RLS: users can only see/write their own events
ALTER TABLE track_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events"
  ON track_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own events"
  ON track_events FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_track_events_user_id ON track_events(user_id);
CREATE INDEX IF NOT EXISTS idx_track_events_user_type ON track_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_track_events_created ON track_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_track_events_track ON track_events(user_id, track_id);

-- Auto-expire impressions older than 30 days (keeps DB lean)
-- Run this as a cron in Supabase Edge Functions later, for now just a reminder:
-- DELETE FROM track_events WHERE event_type = 'impression' AND created_at < now() - interval '30 days';
