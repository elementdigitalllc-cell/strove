-- ============================================================
-- Strove: comments + saved_posts tables.
-- Run after supabase-setup.sql and supabase-trigger.sql.
-- ============================================================

create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamp default now()
);

create index if not exists comments_post_id_idx on public.comments(post_id);

alter table public.comments enable row level security;
drop policy if exists "comments_select_all" on public.comments;
drop policy if exists "comments_insert_own" on public.comments;
drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_select_all" on public.comments for select using (true);
create policy "comments_insert_own" on public.comments for insert with check (auth.uid() = user_id);
create policy "comments_delete_own" on public.comments for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- Posts: add comments counter so feed cards can show count.
-- ---------------------------------------------------------
alter table public.posts add column if not exists comments int default 0;

-- Bump posts.comments whenever a row is added/removed.
create or replace function public.comments_count_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set comments = coalesce(comments, 0) + 1 where id = new.post_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update public.posts set comments = greatest(coalesce(comments, 0) - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists comments_count_ins on public.comments;
drop trigger if exists comments_count_del on public.comments;
create trigger comments_count_ins after insert on public.comments
  for each row execute function public.comments_count_update();
create trigger comments_count_del after delete on public.comments
  for each row execute function public.comments_count_update();

-- ============================================================
-- saved_posts (bookmarks)
-- ============================================================
create table if not exists public.saved_posts (
  user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamp default now(),
  primary key (user_id, post_id)
);

alter table public.saved_posts enable row level security;
drop policy if exists "saves_select_own" on public.saved_posts;
drop policy if exists "saves_insert_own" on public.saved_posts;
drop policy if exists "saves_delete_own" on public.saved_posts;
create policy "saves_select_own" on public.saved_posts for select using (auth.uid() = user_id);
create policy "saves_insert_own" on public.saved_posts for insert with check (auth.uid() = user_id);
create policy "saves_delete_own" on public.saved_posts for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- bump_post: extend whitelist to include comments column
-- ---------------------------------------------------------
create or replace function public.bump_post(post_id uuid, field text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if field not in ('likes', 'reposts', 'views', 'comments') then
    raise exception 'Invalid field: %', field;
  end if;
  execute format('update public.posts set %I = coalesce(%I, 0) + 1 where id = $1', field, field)
    using post_id;
end;
$$;

grant execute on function public.bump_post(uuid, text) to anon, authenticated;
