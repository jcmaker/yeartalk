-- Supabase RLS Policies for YearTalk
-- 
-- IMPORTANT: Service role key (SUPABASE_SERVICE_ROLE_KEY) must NEVER be used client-side.
-- It bypasses RLS and should only be used in server-side API routes.
--
-- This file sets up Row Level Security (RLS) for public read access by share_slug
-- and ensures deletes are handled server-side only.

-- Enable RLS on all tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_ai ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Public read by share_slug" ON rooms;
DROP POLICY IF EXISTS "Public read participants by room" ON room_participants;
DROP POLICY IF EXISTS "Public read stats by room" ON room_stats;
DROP POLICY IF EXISTS "Public read ai by room" ON room_ai;

-- Policy: Allow public read access to rooms with matching share_slug and status='ready'
-- Note: This uses a custom header 'x-slug' that the client must send.
-- Alternatively, you can use a function that checks the slug from the URL path.
CREATE POLICY "Public read by share_slug" ON rooms
  FOR SELECT
  USING (
    share_slug = current_setting('request.headers.x-slug', true)::text
    AND status = 'ready'
  );

-- Policy: Allow public read access to participants for rooms accessible via share_slug
CREATE POLICY "Public read participants by room" ON room_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_participants.room_id
        AND rooms.share_slug = current_setting('request.headers.x-slug', true)::text
        AND rooms.status = 'ready'
    )
  );

-- Policy: Allow public read access to stats for rooms accessible via share_slug
CREATE POLICY "Public read stats by room" ON room_stats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_stats.room_id
        AND rooms.share_slug = current_setting('request.headers.x-slug', true)::text
        AND rooms.status = 'ready'
    )
  );

-- Policy: Allow public read access to AI summaries for rooms accessible via share_slug
CREATE POLICY "Public read ai by room" ON room_ai
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_ai.room_id
        AND rooms.share_slug = current_setting('request.headers.x-slug', true)::text
        AND rooms.status = 'ready'
    )
  );

-- Note: DELETE operations are NOT allowed via RLS policies.
-- All deletes must go through server-side API routes that:
-- 1. Verify the delete_token
-- 2. Use the service role key (which bypasses RLS)
-- 3. Perform the cascade delete

