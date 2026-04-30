create table if not exists public.ppla_profiles (
  profile_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ppla_profiles enable row level security;

drop policy if exists "users read own app payload" on public.ppla_profiles;
drop policy if exists "users upsert own app payload" on public.ppla_profiles;
drop policy if exists "users update own app payload" on public.ppla_profiles;

create policy "users read own app payload"
on public.ppla_profiles
for select
to authenticated
using (auth.uid() = profile_id);

create policy "users upsert own app payload"
on public.ppla_profiles
for insert
to authenticated
with check (auth.uid() = profile_id);

create policy "users update own app payload"
on public.ppla_profiles
for update
to authenticated
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

create unique index if not exists uq_profiles_username_lower on public.profiles (lower(username));
create index if not exists idx_friend_requests_to_user_status on public.friend_requests (to_user, status);
create index if not exists idx_workout_checkins_user_date_desc on public.workout_checkins (user_id, checkin_date desc);
create index if not exists idx_user_stats_score_desc on public.user_stats (score desc);
