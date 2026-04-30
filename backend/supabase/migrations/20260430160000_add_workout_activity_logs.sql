create table if not exists public.workout_activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_date date not null,
  activity_type text not null check (activity_type in ('gym', 'extra')),
  sport_name text,
  points int not null check (points in (6, 10)),
  created_at timestamptz not null default now()
);

create index if not exists idx_workout_activity_logs_user_date_desc
on public.workout_activity_logs (user_id, activity_date desc);

alter table public.workout_activity_logs enable row level security;

drop policy if exists "users insert own activity logs" on public.workout_activity_logs;
drop policy if exists "users read own or friends activity logs" on public.workout_activity_logs;

create policy "users insert own activity logs"
on public.workout_activity_logs
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "users read own or friends activity logs"
on public.workout_activity_logs
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.friendships f
    where f.user_id = auth.uid()
      and f.friend_id = workout_activity_logs.user_id
  )
);

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
  if v_type not in ('gym', 'extra') then
    raise exception 'Invalid activity type: %', v_type;
  end if;
  v_points := case when v_type = 'gym' then 10 else 6 end;

  insert into public.workout_activity_logs (user_id, activity_date, activity_type, sport_name, points)
  values (v_user_id, p_date, v_type, p_sport_name, v_points);
end;
$$;

grant execute on function public.submit_activity(date, text, text) to authenticated;
