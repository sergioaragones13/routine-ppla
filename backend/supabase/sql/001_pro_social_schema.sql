create extension if not exists "pgcrypto";

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

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 24),
  avatar_url text,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_profiles_username_lower on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "profiles are readable by authenticated users" on public.profiles;
drop policy if exists "users insert own profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;

create policy "profiles are readable by authenticated users"
on public.profiles
for select
to authenticated
using (true);

create policy "users insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "users update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

do $$ begin
  create type public.friend_request_status as enum ('pending', 'accepted', 'rejected', 'cancelled');
exception
  when duplicate_object then null;
end $$;

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
create index if not exists idx_friend_requests_to_user_status
on public.friend_requests (to_user, status);

alter table public.friend_requests enable row level security;

drop policy if exists "users can read own requests" on public.friend_requests;
drop policy if exists "users can create outgoing request" on public.friend_requests;
drop policy if exists "receiver can update request status" on public.friend_requests;
drop policy if exists "sender can cancel pending request" on public.friend_requests;

create policy "users can read own requests"
on public.friend_requests
for select
to authenticated
using (auth.uid() = from_user or auth.uid() = to_user);

create policy "users can create outgoing request"
on public.friend_requests
for insert
to authenticated
with check (auth.uid() = from_user);

create policy "receiver can update request status"
on public.friend_requests
for update
to authenticated
using (auth.uid() = to_user and status = 'pending')
with check (auth.uid() = to_user and status in ('accepted', 'rejected'));

create policy "sender can cancel pending request"
on public.friend_requests
for update
to authenticated
using (auth.uid() = from_user and status = 'pending')
with check (auth.uid() = from_user and status = 'cancelled');

create table if not exists public.friendships (
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create index if not exists idx_friendships_user on public.friendships(user_id);

alter table public.friendships enable row level security;

drop policy if exists "users can read own friendships" on public.friendships;
create policy "users can read own friendships"
on public.friendships
for select
to authenticated
using (auth.uid() = user_id);

create table if not exists public.workout_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkin_date date not null,
  did_train boolean not null,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

create index if not exists idx_workout_checkins_user_date_desc
on public.workout_checkins (user_id, checkin_date desc);

alter table public.workout_checkins enable row level security;

drop policy if exists "users read own checkins" on public.workout_checkins;
drop policy if exists "users insert own checkins" on public.workout_checkins;
drop policy if exists "users update own checkins" on public.workout_checkins;

create policy "users read own checkins"
on public.workout_checkins
for select
to authenticated
using (auth.uid() = user_id);

create policy "users insert own checkins"
on public.workout_checkins
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "users update own checkins"
on public.workout_checkins
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.user_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  score int not null default 0,
  streak int not null default 0,
  best_streak int not null default 0,
  last_checkin_date date,
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_stats_score_desc on public.user_stats (score desc);

alter table public.user_stats enable row level security;

drop policy if exists "users read own stats" on public.user_stats;
create policy "users read own stats"
on public.user_stats
for select
to authenticated
using (auth.uid() = user_id);

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

create or replace function public.apply_checkin_score(p_user_id uuid, p_date date, p_did_train boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stats public.user_stats%rowtype;
begin
  insert into public.user_stats (user_id) values (p_user_id) on conflict (user_id) do nothing;
  select * into v_stats from public.user_stats where user_id = p_user_id for update;

  if p_did_train then
    v_stats.score := v_stats.score + 10;
    v_stats.streak := v_stats.streak + 1;
    v_stats.best_streak := greatest(v_stats.best_streak, v_stats.streak);
  else
    v_stats.score := v_stats.score - 12;
    v_stats.streak := 0;
  end if;

  update public.user_stats
  set score = v_stats.score,
      streak = v_stats.streak,
      best_streak = v_stats.best_streak,
      last_checkin_date = p_date,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

create or replace function public.submit_checkin(p_date date, p_did_train boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing boolean;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select did_train into v_existing
  from public.workout_checkins
  where user_id = v_user_id and checkin_date = p_date;

  if found then
    if v_existing is distinct from p_did_train then
      perform public.apply_checkin_score(v_user_id, p_date, not p_did_train);
      update public.workout_checkins
      set did_train = p_did_train, note = p_note
      where user_id = v_user_id and checkin_date = p_date;
      perform public.apply_checkin_score(v_user_id, p_date, p_did_train);
    else
      update public.workout_checkins
      set note = p_note
      where user_id = v_user_id and checkin_date = p_date;
    end if;
  else
    insert into public.workout_checkins (user_id, checkin_date, did_train, note)
    values (v_user_id, p_date, p_did_train, p_note);
    perform public.apply_checkin_score(v_user_id, p_date, p_did_train);
  end if;
end;
$$;

create or replace view public.friend_leaderboard
with (security_invoker = true) as
select
  f.user_id as viewer_id,
  p.id as user_id,
  p.username,
  coalesce(s.score, 0) as score,
  coalesce(s.streak, 0) as streak,
  coalesce(s.best_streak, 0) as best_streak,
  s.last_checkin_date
from public.friendships f
join public.profiles p on p.id = f.friend_id
left join public.user_stats s on s.user_id = p.id;

revoke all on function public.apply_checkin_score(uuid, date, boolean) from public;
grant execute on function public.submit_checkin(date, boolean, text) to authenticated;
grant select on public.friend_leaderboard to authenticated;
