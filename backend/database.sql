-- Consolidated database schema (single file).
-- Source: previous supabase sql + migrations merged into one entrypoint.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.friend_request_status as enum ('pending', 'accepted', 'rejected', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.ppla_profiles (
  profile_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 24),
  avatar_url text,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_profiles_username_lower on public.profiles (lower(username));

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  status public.friend_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (from_user <> to_user)
);

create unique index if not exists uq_friend_request_pair_pending
on public.friend_requests (from_user, to_user)
where status = 'pending';

create table if not exists public.friendships (
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create table if not exists public.workout_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkin_date date not null,
  did_train boolean not null,
  note text,
  training_mode text not null default 'gym' check (training_mode in ('gym', 'extra', 'missed')),
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

create table if not exists public.workout_activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_date date not null,
  activity_type text not null check (activity_type in ('gym', 'extra', 'missed')),
  sport_name text,
  points int not null check (points in (-12, 6, 10)),
  created_at timestamptz not null default now()
);

create unique index if not exists uq_workout_activity_logs_user_day
on public.workout_activity_logs (user_id, activity_date);

create table if not exists public.user_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  score int not null default 0,
  streak int not null default 0,
  best_streak int not null default 0,
  last_checkin_date date,
  extra_sessions int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.exercise_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  default_sets text,
  default_guide jsonb,
  youtube_url text,
  image_query text,
  created_at timestamptz not null default now()
);

create table if not exists public.routine_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routine_template_days (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.routine_templates(id) on delete cascade,
  day_key text not null,
  day_order int2 not null,
  created_at timestamptz not null default now()
);

create table if not exists public.routine_template_day_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.routine_template_days(id) on delete cascade,
  exercise_id uuid not null references public.exercise_catalog(id) on delete restrict,
  sets text not null default '',
  is_s_tier bool not null default false,
  sort_order int4 not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.user_routine_assignments (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  template_id uuid not null references public.routine_templates(id) on delete restrict,
  planned_day_key text not null default 'monday',
  active bool not null default true,
  updated_at timestamptz not null default now()
);

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
  day_key text not null,
  exercise_slug text not null,
  done bool not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, day_key, exercise_slug)
);

create table if not exists public.user_session_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  started_at timestamptz,
  last_duration_sec int4 not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_timer_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  seconds int4 not null default 0,
  target int4,
  running bool not null default false,
  end_at timestamptz,
  auto_start bool not null default false,
  updated_at timestamptz not null default now()
);

create or replace function public.handle_friend_request_accept()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    insert into public.friendships (user_id, friend_id) values (new.from_user, new.to_user) on conflict do nothing;
    insert into public.friendships (user_id, friend_id) values (new.to_user, new.from_user) on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_friend_request_accept on public.friend_requests;
create trigger trg_friend_request_accept
after update on public.friend_requests
for each row execute function public.handle_friend_request_accept();

create or replace function public.recompute_user_stats_from_activity(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_score int := 0;
  v_streak int := 0;
  v_best_streak int := 0;
  v_extra_sessions int := 0;
  v_last_checkin_date date := null;
begin
  for v_row in
    select activity_date, activity_type, points
    from public.workout_activity_logs
    where user_id = p_user_id
    order by activity_date asc, created_at asc
  loop
    v_last_checkin_date := v_row.activity_date;
    v_score := v_score + coalesce(v_row.points, 0);
    if v_row.activity_type in ('gym', 'extra') then
      v_streak := v_streak + 1;
      v_best_streak := greatest(v_best_streak, v_streak);
      if v_row.activity_type = 'extra' then
        v_extra_sessions := v_extra_sessions + 1;
      end if;
    else
      v_streak := 0;
    end if;
  end loop;

  insert into public.user_stats (user_id, score, streak, best_streak, extra_sessions, last_checkin_date, updated_at)
  values (p_user_id, v_score, v_streak, v_best_streak, v_extra_sessions, v_last_checkin_date, now())
  on conflict (user_id) do update
  set
    score = excluded.score,
    streak = excluded.streak,
    best_streak = excluded.best_streak,
    extra_sessions = excluded.extra_sessions,
    last_checkin_date = excluded.last_checkin_date,
    updated_at = now();
end;
$$;

create or replace function public.submit_activity(
  p_date date,
  p_activity_type text,
  p_sport_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_type text := lower(coalesce(p_activity_type, 'extra'));
  v_points int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if v_type not in ('gym', 'extra', 'missed') then
    raise exception 'Invalid activity type: %', v_type;
  end if;

  v_points := case
    when v_type = 'gym' then 10
    when v_type = 'extra' then 6
    else -12
  end;

  insert into public.workout_activity_logs (user_id, activity_date, activity_type, sport_name, points)
  values (
    v_user_id,
    p_date,
    v_type,
    case when v_type = 'missed' then null else p_sport_name end,
    v_points
  )
  on conflict (user_id, activity_date) do update
  set
    activity_type = excluded.activity_type,
    sport_name = excluded.sport_name,
    points = excluded.points,
    created_at = now();

  perform public.recompute_user_stats_from_activity(v_user_id);
end;
$$;

create or replace function public.get_friend_leaderboard_period(p_from date, p_to date)
returns table (
  user_id uuid,
  username text,
  score int,
  streak int,
  extra_sessions int,
  trained_days int,
  last_activity_date date
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select auth.uid() as viewer_id
  ),
  peers as (
    select viewer_id as user_id from me
    union
    select f.friend_id
    from public.friendships f
    join me on me.viewer_id = f.user_id
  ),
  period_activity as (
    select
      l.user_id,
      coalesce(sum(l.points), 0)::int as score,
      count(*) filter (where l.activity_type in ('gym', 'extra'))::int as trained_days,
      count(*) filter (where l.activity_type = 'extra')::int as extra_sessions,
      max(l.activity_date) as last_activity_date
    from public.workout_activity_logs l
    where l.activity_date between p_from and p_to
      and l.user_id in (select user_id from peers)
    group by l.user_id
  )
  select
    p.id as user_id,
    p.username,
    coalesce(a.score, 0) as score,
    coalesce(a.trained_days, 0) as streak,
    coalesce(a.extra_sessions, 0) as extra_sessions,
    coalesce(a.trained_days, 0) as trained_days,
    a.last_activity_date
  from peers pr
  join public.profiles p on p.id = pr.user_id
  left join period_activity a on a.user_id = pr.user_id
  order by coalesce(a.score, 0) desc, p.username asc;
$$;
