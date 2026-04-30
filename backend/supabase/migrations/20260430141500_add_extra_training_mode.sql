alter table public.workout_checkins
add column if not exists training_mode text not null default 'gym';

alter table public.workout_checkins
drop constraint if exists workout_checkins_training_mode_check;

alter table public.workout_checkins
add constraint workout_checkins_training_mode_check
check (training_mode in ('gym', 'extra', 'missed'));

alter table public.user_stats
add column if not exists extra_sessions int not null default 0;

create or replace function public.recompute_user_stats(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score int := 0;
  v_streak int := 0;
  v_best_streak int := 0;
  v_extra_sessions int := 0;
  v_last_checkin_date date := null;
  v_row record;
begin
  for v_row in
    select checkin_date, did_train, training_mode
    from public.workout_checkins
    where user_id = p_user_id
    order by checkin_date asc, created_at asc
  loop
    v_last_checkin_date := v_row.checkin_date;
    if v_row.did_train then
      if v_row.training_mode = 'extra' then
        v_score := v_score + 6;
        v_extra_sessions := v_extra_sessions + 1;
      else
        v_score := v_score + 10;
      end if;
      v_streak := v_streak + 1;
      v_best_streak := greatest(v_best_streak, v_streak);
    else
      v_score := v_score - 12;
      v_streak := 0;
    end if;
  end loop;

  insert into public.user_stats (user_id, score, streak, best_streak, extra_sessions, last_checkin_date, updated_at)
  values (p_user_id, v_score, v_streak, v_best_streak, v_extra_sessions, v_last_checkin_date, now())
  on conflict (user_id) do update
  set score = excluded.score,
      streak = excluded.streak,
      best_streak = excluded.best_streak,
      extra_sessions = excluded.extra_sessions,
      last_checkin_date = excluded.last_checkin_date,
      updated_at = now();
end;
$$;

create or replace function public.submit_checkin(
  p_date date,
  p_did_train boolean,
  p_note text default null,
  p_training_mode text default 'gym'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_mode text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_mode := lower(coalesce(p_training_mode, 'gym'));
  if not p_did_train then
    v_mode := 'missed';
  end if;
  if v_mode not in ('gym', 'extra', 'missed') then
    raise exception 'Invalid training mode: %', v_mode;
  end if;

  insert into public.workout_checkins (user_id, checkin_date, did_train, note, training_mode)
  values (v_user_id, p_date, p_did_train, p_note, v_mode)
  on conflict (user_id, checkin_date) do update
  set did_train = excluded.did_train,
      note = excluded.note,
      training_mode = excluded.training_mode;

  perform public.recompute_user_stats(v_user_id);
end;
$$;

drop view if exists public.friend_leaderboard;

create view public.friend_leaderboard
with (security_invoker = true) as
select
  f.user_id as viewer_id,
  p.id as user_id,
  p.username,
  coalesce(s.score, 0) as score,
  coalesce(s.streak, 0) as streak,
  coalesce(s.best_streak, 0) as best_streak,
  coalesce(s.extra_sessions, 0) as extra_sessions,
  s.last_checkin_date
from public.friendships f
join public.profiles p on p.id = f.friend_id
left join public.user_stats s on s.user_id = p.id
union all
select
  p.id as viewer_id,
  p.id as user_id,
  p.username,
  coalesce(s.score, 0) as score,
  coalesce(s.streak, 0) as streak,
  coalesce(s.best_streak, 0) as best_streak,
  coalesce(s.extra_sessions, 0) as extra_sessions,
  s.last_checkin_date
from public.profiles p
left join public.user_stats s on s.user_id = p.id;

grant execute on function public.submit_checkin(date, boolean, text, text) to authenticated;
grant select on public.friend_leaderboard to authenticated;
