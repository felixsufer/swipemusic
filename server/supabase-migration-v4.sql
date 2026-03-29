-- SwipeSound v4 Migration: User Streak Persistence
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/gnwthbculpograhldphi/sql

-- Persist daily streak server-side so it survives device switches
-- The hook reconciles local vs server: always takes the higher streak value on load
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  total_days integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own streak"
  ON user_streaks FOR ALL
  USING (auth.uid() = user_id);

-- Also add the crate_items index from v3 if not already present
-- (safe to re-run — IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_crate_items_user_id ON crate_items(user_id);
