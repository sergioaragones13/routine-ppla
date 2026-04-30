# Contributing

## Setup

1. Fork or branch from `main`.
2. Install dependencies:

```bash
cd frontend
npm install
```

3. Configure environment variables in `frontend/.env`:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Development Rules

- Keep CSS in BEM naming format.
- Keep code and comments in English.
- Do not hardcode secrets.
- Do not commit `.env`.
- Keep changes focused and small.

## Quality Checks (Required)

Run all before opening a PR:

```bash
cd frontend
npm run typecheck
npm run lint
npm run test
npm run build
```

Optional formatting fix:

```bash
cd frontend
npm run format
```

## Pull Request Expectations

- Clear title and concise description
- Explain why the change exists
- Mention testing done
- Avoid unrelated refactors in feature PRs
