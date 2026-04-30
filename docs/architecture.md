# Architecture Overview

## Frontend Layers

- `frontend/src/main.ts`: app orchestration and UI wiring.
- `frontend/src/data/routine.ts`: static workout metadata.
- `frontend/src/lib/`:
  - `supabase.ts`: Supabase client bootstrap.
  - `pplaSnapshot.ts`: local persistence snapshot helpers.
  - `scoring.ts`: pure score/streak logic (testable).
- `frontend/src/types/app.ts`: shared domain types.

## Runtime Flow

1. App boots and initializes Supabase client.
2. Auth gate blocks the app until:
   - user is logged in
   - username exists in `profiles`
3. After unlock:
   - local state is loaded
   - social data is refreshed
   - cloud sync runs using authenticated `user.id`

## Persistence Strategy

- Local state lives under `ppla_*` keys in LocalStorage.
- Authenticated cloud backup/sync is stored in `public.ppla_profiles`.
- Social entities use normalized Postgres tables:
  - `profiles`
  - `friend_requests`
  - `friendships`
  - `workout_checkins`
  - `user_stats`

## Security Model

- Frontend uses only Supabase URL + anon key.
- Access control is enforced through RLS policies.
- Sensitive database operations are encapsulated in SQL functions and triggers.
