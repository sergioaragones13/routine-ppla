drop policy if exists "users read own checkins" on public.workout_checkins;
drop policy if exists "users read own or friends checkins" on public.workout_checkins;

create policy "users read own or friends checkins"
on public.workout_checkins
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.friendships f
    where f.user_id = auth.uid()
      and f.friend_id = workout_checkins.user_id
  )
);
