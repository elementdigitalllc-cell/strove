-- ============================================================
-- Strove: comment likes + comment replies.
-- Run after the prior SQL files. Safe to re-run.
-- ============================================================

-- ---------------------------------------------------------
-- 1) comments.parent_comment_id  (for replies)
-- ---------------------------------------------------------
alter table public.comments
  add column if not exists parent_comment_id uuid references public.comments(id) on delete cascade,
  add column if not exists likes int default 0;

create index if not exists comments_parent_comment_id_idx on public.comments(parent_comment_id);

-- ---------------------------------------------------------
-- 2) comment_likes (one row per user per comment)
-- ---------------------------------------------------------
create table if not exists public.comment_likes (
  user_id uuid references public.profiles(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  created_at timestamp default now(),
  primary key (user_id, comment_id)
);

create index if not exists comment_likes_comment_id_idx on public.comment_likes(comment_id);

alter table public.comment_likes enable row level security;

drop policy if exists "comment_likes_select_all" on public.comment_likes;
drop policy if exists "comment_likes_insert_own" on public.comment_likes;
drop policy if exists "comment_likes_delete_own" on public.comment_likes;

create policy "comment_likes_select_all" on public.comment_likes for select using (true);
create policy "comment_likes_insert_own" on public.comment_likes for insert with check (auth.uid() = user_id);
create policy "comment_likes_delete_own" on public.comment_likes for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- 3) Triggers that recompute comments.likes from the truth.
-- ---------------------------------------------------------
drop trigger if exists comment_likes_count_ins on public.comment_likes;
drop trigger if exists comment_likes_count_del on public.comment_likes;

create or replace function public.increment_comment_likes()
returns trigger as $$
begin
  update public.comments
  set likes = (select count(*) from public.comment_likes where comment_id = NEW.comment_id)
  where id = NEW.comment_id;
  return NEW;
end;
$$ language plpgsql security definer;

create or replace function public.decrement_comment_likes()
returns trigger as $$
begin
  update public.comments
  set likes = (select count(*) from public.comment_likes where comment_id = OLD.comment_id)
  where id = OLD.comment_id;
  return OLD;
end;
$$ language plpgsql security definer;

create trigger comment_likes_count_ins after insert on public.comment_likes
  for each row execute function public.increment_comment_likes();
create trigger comment_likes_count_del after delete on public.comment_likes
  for each row execute function public.decrement_comment_likes();

-- Backfill comments.likes from current rows.
update public.comments c
set likes = (select count(*) from public.comment_likes l where l.comment_id = c.id);
