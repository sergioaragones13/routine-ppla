# Deployment Runbook

## Target

GitHub Pages via `.github/workflows/deploy.yml`.

## Required GitHub Secrets

Repository -> Settings -> Secrets and variables -> Actions:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## CI/CD Pipeline

1. `quality` job runs:
   - typecheck
   - lint
   - tests
   - build
2. If event is not PR:
   - `build-pages` uploads `dist`
   - `deploy` publishes to GitHub Pages

## Supabase Prerequisites

- Execute base SQL and migrations.
- Configure Auth providers and redirect URLs:
  - local dev URL
  - production GitHub Pages URL

## Release Checklist

1. Run locally:

```bash
cd frontend
npm run typecheck
npm run lint
npm run test
npm run build
```

2. Push to `main`.
3. Verify GitHub Actions workflow success.
4. Smoke test:
   - auth gate
   - username onboarding
   - social refresh and leaderboard
   - timer + routine edits
