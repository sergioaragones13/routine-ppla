# Database and RLS

## Schema Source

Primary SQL:

- `backend/supabase/sql/001_pro_social_schema.sql`

Incremental migrations:

- `backend/supabase/migrations/20260430110000_app_payload_and_indexes.sql`
- `backend/supabase/migrations/20260430111000_leaderboard_security_invoker.sql`

## Core Tables

- `profiles`: user public identity
- `friend_requests`: pending/accepted/rejected/cancelled requests
- `friendships`: bidirectional accepted relationships
- `workout_checkins`: per-user daily train/miss records
- `user_stats`: score/streak aggregates
- `ppla_profiles`: per-user full app payload for cloud sync
- `exercise_catalog`: exercise master data
- `routine_templates`: reusable routine definitions
- `routine_template_days`: ordered week days inside each template
- `routine_template_day_exercises`: exercises assigned per template day
- `user_routine_assignments`: each user's active routine and planned day

## RLS Principles

- All user tables have RLS enabled.
- User-scoped tables filter by `auth.uid()`.
- Read/write access is granted only where explicitly needed.
- `friend_leaderboard` is `security_invoker = true`.

## Functions / Triggers

- `handle_friend_request_accept`: creates reciprocal rows in `friendships`.
- `apply_checkin_score`: score and streak mutations.
- `submit_checkin`: idempotent check-in API for authenticated user.

All `security definer` functions set `search_path = public`.

## Operational Notes

- Never expose `service_role` to client code.
- Keep policies restrictive; avoid broad public grants.
- Apply migrations in chronological order.
