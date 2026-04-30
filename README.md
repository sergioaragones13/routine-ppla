# PPLA Routine

PPLA Routine is now organized as a clean two-layer app:

- `frontend/` for UI, app state, and client integrations
- `backend/` for database schema, migrations, and service-side logic

## Workspace Structure

```text
.
├─ frontend/
│  ├─ src/
│  ├─ public/
│  ├─ package.json
│  └─ vite.config.ts
├─ backend/
│  └─ supabase/
│     ├─ sql/
│     └─ migrations/
├─ .github/workflows/
├─ docs/
├─ SECURITY.md
└─ CONTRIBUTING.md
```

## Frontend

Main stack:

- Vite
- TypeScript (strict)
- CSS (BEM)
- Supabase client SDK
- Vitest + ESLint + Prettier

Run locally:

```bash
cd frontend
npm install
cp .env.example .env
# set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Quality gates:

```bash
cd frontend
npm run typecheck
npm run lint
npm run test
npm run build
```

## Backend

Supabase backend assets live under `backend/supabase/`:

- `backend/supabase/sql/` for base schema
- `backend/supabase/migrations/` for incremental changes

## CI/CD

GitHub Actions deploys Pages from `frontend/dist` and runs all quality gates from `frontend/`.

## Docs

- Architecture: `docs/architecture.md`
- Database + RLS: `docs/database-rls.md`
- Deployment runbook: `docs/deployment.md`
- Security checklist: `SECURITY.md`
- Contribution guide: `CONTRIBUTING.md`
