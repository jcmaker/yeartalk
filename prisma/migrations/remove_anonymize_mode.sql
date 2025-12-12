-- Remove anonymize_mode column from rooms table
-- Run this SQL in Supabase Dashboard → SQL Editor

ALTER TABLE "rooms" DROP COLUMN IF EXISTS "anonymize_mode";

