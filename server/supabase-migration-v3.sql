-- SwipeSound v3 Migration: Crate Items Persistence
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/gnwthbculpograhldphi/sql

-- Dedicated crate_items table — mirrors liked_tracks structure
-- Separating crate from liked allows different semantics:
--   liked = "I like this song" (taste signal)
--   crate = "I want to play this at a gig" (DJ collection)
CREATE TABLE IF NOT EXISTS crate_items (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  track_id text NOT NULL,
  track_data jsonb NOT NULL,
  saved_at timestamptz DEFAULT now(),
  UNIQUE(user_id, track_id)
);

ALTER TABLE crate_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own crate items"
  ON crate_items FOR ALL
  USING (auth.uid() = user_id);

-- Index for fast user crate lookups
CREATE INDEX IF NOT EXISTS idx_crate_items_user_id ON crate_items(user_id);
CREATE INDEX IF NOT EXISTS idx_crate_items_saved ON crate_items(user_id, saved_at DESC);
