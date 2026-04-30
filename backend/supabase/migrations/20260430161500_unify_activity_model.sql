alter table public.workout_activity_logs
drop constraint if exists workout_activity_logs_activity_type_check;

alter table public.workout_activity_logs
add constraint workout_activity_logs_activity_type_check
check (activity_type in ('gym', 'extra', 'missed'));

alter table public.workout_activity_logs
drop constraint if exists workout_activity_logs_points_check;

alter table public.workout_activity_logs
add constraint workout_activity_logs_points_check
check (points in (-12, 6, 10));

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
  );
end;
$$;

-- Backfill legacy records from workout_checkins to unified activity logs.
insert into public.workout_activity_logs (user_id, activity_date, activity_type, sport_name, points, created_at)
select
  c.user_id,
  c.checkin_date,
  case
    when c.did_train = false then 'missed'
    when lower(coalesce(c.training_mode, 'gym')) = 'extra' then 'extra'
    else 'gym'
  end as activity_type,
  null::text as sport_name,
  case
    when c.did_train = false then -12
    when lower(coalesce(c.training_mode, 'gym')) = 'extra' then 6
    else 10
  end as points,
  c.created_at
from public.workout_checkins c
where not exists (
  select 1
  from public.workout_activity_logs l
  where l.user_id = c.user_id
    and l.activity_date = c.checkin_date
    and l.activity_type = case
      when c.did_train = false then 'missed'
      when lower(coalesce(c.training_mode, 'gym')) = 'extra' then 'extra'
      else 'gym'
    end
);
