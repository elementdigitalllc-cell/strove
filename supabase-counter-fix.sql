-- ============================================================
-- Strove: counter fix-up.
--   1. Backfill posts.comments / posts.likes / posts.reposts
--      from the actual rows (handles data inserted before the
--      auto-increment triggers existed).
--   2. Drop the like + reposts triggers — we'll bump from the
--      client via a single signed-delta RPC so the source of
--      truth is unambiguous.
--   3. Install change_post_count(post_id, field, delta) RPC.
--   4. (Comments trigger stays — it's the only one for that
--      counter and it works fine.)
-- ============================================================

-- 1) Backfill
update public.posts p
set comments = (
  select count(*) from public.comments c where c.post_id = p.id
);

update public.posts p
set likes = (
  select count(*) from public.likes l where l.post_id = p.id
);

update public.posts p
set reposts = (
  select count(*) from public.posts r where r.original_post_id = p.id
);

-- 2) Drop the like + reposts triggers (we manage them from the client RPC now).
drop trigger if exists likes_count_ins on public.likes;
drop trigger if exists likes_count_del on public.likes;
drop trigger if exists posts_reposts_count_ins on public.posts;
drop trigger if exists posts_reposts_count_del on public.posts;

-- 3) Generic signed-delta RPC. Whitelists which columns can be touched.
create or replace function public.change_post_count(post_id uuid, field text, delta int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if field not in ('likes', 'reposts', 'views', 'comments') then
    raise exception 'Invalid field: %', field;
  end if;
  execute format(
    'update public.posts set %I = greatest(coalesce(%I, 0) + $1, 0) where id = $2',
    field, field
  ) using delta, post_id;
end;
$$;

revoke all on function public.change_post_count(uuid, text, int) from public;
grant execute on function public.change_post_count(uuid, text, int) to anon, authenticated;
