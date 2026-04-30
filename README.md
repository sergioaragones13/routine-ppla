# PPLA Routine

A production-oriented training app built as a Multi-Page App (MPA) with Supabase as backend.

Core goals:

- Weekly workout planning and routine editing
- Daily training flow with social check-ins
- Friends and monthly leaderboard
- Strict typed frontend and migration-based backend

## Features

- Auth gate with email/password and social provider support (configured in Supabase)
- MPA pages:
  - `index.html` (auth + home)
  - `workout.html` (today workflow)
  - `full-routine.html` (full routine editor/view)
  - `social.html` (friends + leaderboard + monthly record modal)
- Daily activity model with `gym`, `extra`, and `missed`
- Monthly scoring and per-user monthly breakdown
- Supabase-backed user data (routine state, social data, check-ins)
- Responsive UI (BEM CSS), toasts, and mobile-friendly UX

## Project Structure

```text
.
├─ frontend/
│  ├─ src/
│  │  ├─ data/
│  │  ├─ features/
│  │  ├─ lib/
│  │  ├─ services/
│  │  ├─ types/
│  │  ├─ main.ts
│  │  └─ style.css
│  ├─ public/
│  ├─ index.html
│  ├─ workout.html
│  ├─ full-routine.html
│  ├─ social.html
│  ├─ package.json
│  └─ vite.config.ts
├─ backend/
│  └─ supabase/
│     ├─ migrations/
│     └─ sql/
├─ .github/workflows/
├─ docs/
├─ SECURITY.md
└─ CONTRIBUTING.md
```

## Tech Stack

- Frontend: Vite, TypeScript (strict), CSS (BEM), Supabase JS
- Backend: Supabase Postgres, SQL migrations, RLS policies, RPC functions
- Quality: ESLint, Vitest, TypeScript build checks
- CI/CD: GitHub Actions + GitHub Pages

## Local Development

### 1) Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
```

Set values in `frontend/.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Start dev server:

```bash
npm run dev
```

### 2) Quality checks

```bash
cd frontend
npm run typecheck
npm run lint
npm run test
npm run build
```

## Backend and Migrations

Backend assets are under `backend/supabase/`.

- Base SQL assets: `backend/supabase/sql/`
- Incremental migrations: `backend/supabase/migrations/`

Important for current app state:

- Apply all migrations in order
- Ensure `20260430161500_unify_activity_model.sql` is applied

This migration finalizes the unified activity model in `workout_activity_logs` (`gym`, `extra`, `missed`) and includes legacy backfill logic.

## Deployment

GitHub Actions workflow:

- Runs typecheck, lint, tests, and build in `frontend/`
- Builds Pages artifact from `frontend/dist`
- Deploys to GitHub Pages on `main`

Required repository secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If these are missing, auth/login will not work in production.

## Security Notes

- Never commit `.env` files with real keys
- Never expose Supabase `service_role` in frontend or repo
- Keep RLS policies enabled and reviewed for social tables
- Use migration-based schema changes only

See `SECURITY.md` for the full checklist.

## Documentation

- Architecture: `docs/architecture.md`
- Database + RLS: `docs/database-rls.md`
- Deployment: `docs/deployment.md`
- Security: `SECURITY.md`
- Contributing: `CONTRIBUTING.md`
