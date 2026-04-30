create table if not exists public.user_exercise_notes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  exercise_slug text not null,
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_slug)
);

create table if not exists public.user_exercise_prs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  exercise_slug text not null,
  weight text not null default '',
  reps text not null default '',
  rir text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_slug)
);

create table if not exists public.user_day_exercise_checks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_key text not null check (day_key in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  exercise_slug text not null,
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, day_key, exercise_slug)
);

create table if not exists public.user_session_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  started_at timestamptz,
  last_duration_sec int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_timer_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  seconds int not null default 0,
  target int,
  running boolean not null default false,
  end_at timestamptz,
  auto_start boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_exercise_notes_user on public.user_exercise_notes (user_id);
create index if not exists idx_user_exercise_prs_user on public.user_exercise_prs (user_id);
create index if not exists idx_user_day_exercise_checks_user_day on public.user_day_exercise_checks (user_id, day_key);

alter table public.user_exercise_notes enable row level security;
alter table public.user_exercise_prs enable row level security;
alter table public.user_day_exercise_checks enable row level security;
alter table public.user_session_state enable row level security;
alter table public.user_timer_state enable row level security;

drop policy if exists "notes read own" on public.user_exercise_notes;
drop policy if exists "notes insert own" on public.user_exercise_notes;
drop policy if exists "notes update own" on public.user_exercise_notes;
drop policy if exists "notes delete own" on public.user_exercise_notes;

create policy "notes read own"
on public.user_exercise_notes
for select
to authenticated
using (auth.uid() = user_id);

create policy "notes insert own"
on public.user_exercise_notes
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "notes update own"
on public.user_exercise_notes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "notes delete own"
on public.user_exercise_notes
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "prs read own" on public.user_exercise_prs;
drop policy if exists "prs insert own" on public.user_exercise_prs;
drop policy if exists "prs update own" on public.user_exercise_prs;
drop policy if exists "prs delete own" on public.user_exercise_prs;

create policy "prs read own"
on public.user_exercise_prs
for select
to authenticated
using (auth.uid() = user_id);

create policy "prs insert own"
on public.user_exercise_prs
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "prs update own"
on public.user_exercise_prs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "prs delete own"
on public.user_exercise_prs
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "checks read own" on public.user_day_exercise_checks;
drop policy if exists "checks insert own" on public.user_day_exercise_checks;
drop policy if exists "checks update own" on public.user_day_exercise_checks;
drop policy if exists "checks delete own" on public.user_day_exercise_checks;

create policy "checks read own"
on public.user_day_exercise_checks
for select
to authenticated
using (auth.uid() = user_id);

create policy "checks insert own"
on public.user_day_exercise_checks
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "checks update own"
on public.user_day_exercise_checks
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "checks delete own"
on public.user_day_exercise_checks
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "session read own" on public.user_session_state;
drop policy if exists "session insert own" on public.user_session_state;
drop policy if exists "session update own" on public.user_session_state;

create policy "session read own"
on public.user_session_state
for select
to authenticated
using (auth.uid() = user_id);

create policy "session insert own"
on public.user_session_state
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "session update own"
on public.user_session_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "timer read own" on public.user_timer_state;
drop policy if exists "timer insert own" on public.user_timer_state;
drop policy if exists "timer update own" on public.user_timer_state;

create policy "timer read own"
on public.user_timer_state
for select
to authenticated
using (auth.uid() = user_id);

create policy "timer insert own"
on public.user_timer_state
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "timer update own"
on public.user_timer_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
