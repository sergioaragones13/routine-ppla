drop policy if exists "users read own stats" on public.user_stats;
drop policy if exists "users read own or friends stats" on public.user_stats;

create policy "users read own or friends stats"
on public.user_stats
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.friendships f
    where f.user_id = auth.uid()
      and f.friend_id = user_stats.user_id
  )
);
