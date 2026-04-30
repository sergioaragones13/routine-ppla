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
  s.last_checkin_date
from public.friendships f
join public.profiles p on p.id = f.friend_id
left join public.user_stats s on s.user_id = p.id;

grant select on public.friend_leaderboard to authenticated;
