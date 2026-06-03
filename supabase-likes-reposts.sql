-- ============================================================
-- Strove: per-user likes table + reposts column on posts.
-- Run AFTER supabase-setup.sql, supabase-trigger.sql, and
-- supabase-comments-saves.sql. Safe to re-run.
-- ============================================================

-- ---------------------------------------------------------
-- likes (one row per user per post)
-- ---------------------------------------------------------
create table if not exists public.likes (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp default now(),
  primary key (user_id, post_id)
);

create index if not exists likes_post_id_idx on public.likes(post_id);

alter table public.likes enable row level security;
drop policy if exists "likes_select_all" on public.likes;
drop policy if exists "likes_insert_own" on public.likes;
drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_select_all" on public.likes for select using (true);
create policy "likes_insert_own" on public.likes for insert with check (auth.uid() = user_id);
create policy "likes_delete_own" on public.likes for delete using (auth.uid() = user_id);

-- Bump posts.likes on insert / decrement on delete.
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

drop trigger if exists likes_count_ins on public.likes;
drop trigger if exists likes_count_del on public.likes;
create trigger likes_count_ins after insert on public.likes
  for each row execute function public.likes_count_update();
create trigger likes_count_del after delete on public.likes
  for each row execute function public.likes_count_update();

-- ============================================================
-- posts.original_post_id  (links a repost row to its source)
-- ============================================================
alter table public.posts add column if not exists original_post_id uuid references public.posts(id) on delete set null;

create index if not exists posts_original_post_id_idx on public.posts(original_post_id);

-- Whenever a repost row is inserted/deleted, bump the original's reposts column.
create or replace function public.reposts_count_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' and new.original_post_id is not null then
    update public.posts set reposts = coalesce(reposts, 0) + 1 where id = new.original_post_id;
    return new;
  elsif TG_OP = 'DELETE' and old.original_post_id is not null then
    update public.posts set reposts = greatest(coalesce(reposts, 0) - 1, 0) where id = old.original_post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists posts_reposts_count_ins on public.posts;
drop trigger if exists posts_reposts_count_del on public.posts;
create trigger posts_reposts_count_ins after insert on public.posts
  for each row execute function public.reposts_count_update();
create trigger posts_reposts_count_del after delete on public.posts
  for each row execute function public.reposts_count_update();
