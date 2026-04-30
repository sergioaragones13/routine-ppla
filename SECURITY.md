# Security Checklist

This project is public. Follow these rules before every release.

## Secrets

- Never commit `service_role` keys.
- Never commit `.env` files.
- Frontend only uses:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Supabase

- Keep RLS enabled on all user tables.
- Use `security_invoker` for views.
- Keep `security definer` functions with explicit `search_path`.
- Restrict function execution grants to `authenticated` only when needed.

## OAuth

- In Supabase Auth settings, use exact redirect URLs only:
  - `http://localhost:5173`
  - production GitHub Pages URL
- Avoid wildcard redirects.

## Key Rotation

- Rotate anon keys if exposed in screenshots/chats.
- Rotate immediately if `service_role` is ever leaked.

## Deploy

- Use GitHub Actions secrets for Supabase env variables.
- Do not hardcode credentials in source code.
