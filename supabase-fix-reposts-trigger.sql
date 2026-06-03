-- ============================================================
-- Strove: rebuild posts.reposts triggers so they set the column
-- to the actual count(*) every time. Same shape as the likes and
-- comments fixes. Safe to re-run.
-- ============================================================

drop trigger if exists reposts_count_ins on public.reposts;
drop trigger if exists reposts_count_del on public.reposts;

create or replace function public.increment_reposts()
returns trigger as $$
begin
  update public.posts
  set reposts = (select count(*) from public.reposts where post_id = NEW.post_id)
  where id = NEW.post_id;
  return NEW;
end;
$$ language plpgsql security definer;

create or replace function public.decrement_reposts()
returns trigger as $$
begin
  update public.posts
  set reposts = (select count(*) from public.reposts where post_id = OLD.post_id)
  where id = OLD.post_id;
  return OLD;
end;
$$ language plpgsql security definer;

create trigger reposts_count_ins after insert on public.reposts
  for each row execute function public.increment_reposts();
create trigger reposts_count_del after delete on public.reposts
  for each row execute function public.decrement_reposts();

-- One-shot backfill so posts.reposts is correct right now.
update public.posts p
set reposts = (select count(*) from public.reposts r where r.post_id = p.id);
