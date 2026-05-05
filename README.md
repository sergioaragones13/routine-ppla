# PPLA Routine

A production-oriented training app built with Vite + TypeScript and Supabase as backend.

Core goals:

- Weekly workout planning and routine editing
- Daily training flow with social check-ins
- Friends and leaderboard competition
- Strict typed frontend and SQL-based backend

## Features

- Auth gate with email/password and social provider support (configured in Supabase)
- Single-entry app (`frontend/index.html`) with query-based page routing (`?page=...`)
- Main screens: home, workout, full-routine, social, reto, settings
- Daily activity model with `gym`, `extra`, and `missed`
- Friend leaderboard by period (`this month`, `last 30 days`, `all time`)
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
│  ├─ package.json
│  └─ vite.config.ts
├─ backend/
│  └─ database.sql
├─ .github/workflows/
├─ SECURITY.md
└─ CONTRIBUTING.md
```

## Tech Stack

- Frontend: Vite, TypeScript (strict), CSS (BEM), Supabase JS
- Backend: Supabase Postgres, SQL schema/functions (single file)
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

## Backend

Backend schema and DB functions are consolidated in:

- `backend/database.sql`

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
- Keep access rules reviewed for social tables
- Keep `backend/database.sql` as the single source of truth

See `SECURITY.md` for the full checklist.

## Documentation

- Security: `SECURITY.md`
- Contributing: `CONTRIBUTING.md`
