# Supabase Database Migrations

This project uses SQL migrations in `backend/supabase/migrations`.

## Migration Files

- `20260430110000_app_payload_and_indexes.sql`
  - Adds `ppla_profiles` table used by automatic per-user app state sync.
  - Adds RLS policies for user-owned payload rows.
  - Adds performance indexes for social/checkin queries.
- `20260430111000_leaderboard_security_invoker.sql`
  - Recreates `friend_leaderboard` with `security_invoker = true`.

## Apply in Supabase

Run migration files in SQL Editor in chronological order.

If you already executed `backend/supabase/sql/001_pro_social_schema.sql`, these migrations are safe and idempotent.
