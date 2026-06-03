-- ============================================================
-- Strove: rebuild posts.comments trigger so it sets the column
-- to the actual count(*) every time, instead of relying on
-- increment/decrement. Same shape as the likes fix.
-- Safe to re-run.
-- ============================================================

drop trigger if exists comments_count_ins on public.comments;
drop trigger if exists comments_count_del on public.comments;

create or replace function public.increment_comments()
returns trigger as $$
begin
  update public.posts
  set comments = (select count(*) from public.comments where post_id = NEW.post_id)
  where id = NEW.post_id;
  return NEW;
end;
$$ language plpgsql security definer;

create or replace function public.decrement_comments()
returns trigger as $$
begin
  update public.posts
  set comments = (select count(*) from public.comments where post_id = OLD.post_id)
  where id = OLD.post_id;
  return OLD;
end;
$$ language plpgsql security definer;

create trigger comments_count_ins after insert on public.comments
  for each row execute function public.increment_comments();
create trigger comments_count_del after delete on public.comments
  for each row execute function public.decrement_comments();

-- One-shot backfill so existing rows reflect the truth right now.
update public.posts p
set comments = (select count(*) from public.comments c where c.post_id = p.id);
