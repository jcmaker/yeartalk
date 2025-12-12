-- YearTalk Database Schema Migration
-- Run this SQL in Supabase Dashboard → SQL Editor

-- Create rooms table
CREATE TABLE IF NOT EXISTS "rooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "share_slug" TEXT NOT NULL,
    "delete_token" TEXT NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "privacy_mode" TEXT NOT NULL DEFAULT 'link',
    "anonymize_mode" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "error_code" TEXT,
    "source" TEXT NOT NULL DEFAULT 'kakao_txt',

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- Create room_participants table
CREATE TABLE IF NOT EXISTS "room_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "alias" TEXT NOT NULL,

    CONSTRAINT "room_participants_pkey" PRIMARY KEY ("id")
);

-- Create room_stats table
CREATE TABLE IF NOT EXISTS "room_stats" (
    "room_id" UUID NOT NULL,
    "stats" JSONB NOT NULL,
    "computed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_stats_pkey" PRIMARY KEY ("room_id")
);

-- Create room_ai table
CREATE TABLE IF NOT EXISTS "room_ai" (
    "room_id" UUID NOT NULL,
    "summary" JSONB NOT NULL,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model" TEXT NOT NULL,

    CONSTRAINT "room_ai_pkey" PRIMARY KEY ("room_id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "rooms_share_slug_idx" ON "rooms"("share_slug");
CREATE INDEX IF NOT EXISTS "rooms_delete_token_idx" ON "rooms"("delete_token");
CREATE INDEX IF NOT EXISTS "room_participants_room_id_idx" ON "room_participants"("room_id");

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "rooms_share_slug_key" ON "rooms"("share_slug");
CREATE UNIQUE INDEX IF NOT EXISTS "rooms_delete_token_key" ON "rooms"("delete_token");
CREATE UNIQUE INDEX IF NOT EXISTS "room_participants_room_id_display_name_key" ON "room_participants"("room_id", "display_name");

-- Add foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'room_participants_room_id_fkey'
    ) THEN
        ALTER TABLE "room_participants" 
        ADD CONSTRAINT "room_participants_room_id_fkey" 
        FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'room_stats_room_id_fkey'
    ) THEN
        ALTER TABLE "room_stats" 
        ADD CONSTRAINT "room_stats_room_id_fkey" 
        FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'room_ai_room_id_fkey'
    ) THEN
        ALTER TABLE "room_ai" 
        ADD CONSTRAINT "room_ai_room_id_fkey" 
        FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

