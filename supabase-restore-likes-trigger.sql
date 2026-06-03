-- ============================================================
-- Strove: restore the auto-counting trigger for likes and
-- backfill posts.likes from the actual rows in the likes
-- table. Run AFTER all prior SQL files. Safe to re-run.
-- ============================================================

-- Recreate the trigger function (idempotent).
create or replace function public.likes_count_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set likes = coalesce(likes, 0) + 1 where id = new.post_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update public.posts set likes = greatest(coalesce(likes, 0) - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

-- Reattach the triggers.
drop trigger if exists likes_count_ins on public.likes;
drop trigger if exists likes_count_del on public.likes;
create trigger likes_count_ins after insert on public.likes
  for each row execute function public.likes_count_update();
create trigger likes_count_del after delete on public.likes
  for each row execute function public.likes_count_update();

-- One-shot backfill: rebuild posts.likes from the real rows
-- so any prior double-counting is wiped clean.
update public.posts p
set likes = (select count(*) from public.likes l where l.post_id = p.id);
