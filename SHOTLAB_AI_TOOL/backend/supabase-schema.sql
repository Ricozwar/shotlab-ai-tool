-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor) to create tables for MVP.
-- Tables: users (trial start), daily_usage (50 images / 3 reels per day).

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_usage (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  images_count INT NOT NULL DEFAULT 0,
  reels_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- Backend uses service_role key and needs full access. RLS is disabled so API can insert/update.
-- (If you enable RLS later, add policies for service_role or anon as needed.)
