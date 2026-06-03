-- ============================================================
-- Strove: dedicated reposts junction table + batch views RPC.
-- Safe to re-run. Run AFTER the earlier SQL files.
-- ============================================================

-- ---------------------------------------------------------
-- reposts (one row per user per original post)
-- ---------------------------------------------------------
create table if not exists public.reposts (
  user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamp default now(),
  primary key (user_id, post_id)
);

create index if not exists reposts_post_id_idx on public.reposts(post_id);

alter table public.reposts enable row level security;
drop policy if exists "reposts_select_all" on public.reposts;
drop policy if exists "reposts_insert_own" on public.reposts;
drop policy if exists "reposts_delete_own" on public.reposts;
create policy "reposts_select_all" on public.reposts for select using (true);
create policy "reposts_insert_own" on public.reposts for insert with check (auth.uid() = user_id);
create policy "reposts_delete_own" on public.reposts for delete using (auth.uid() = user_id);

-- Trigger keeps posts.reposts in sync.
create or replace function public.reposts_table_count_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set reposts = coalesce(reposts, 0) + 1 where id = new.post_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update public.posts set reposts = greatest(coalesce(reposts, 0) - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists reposts_count_ins on public.reposts;
drop trigger if exists reposts_count_del on public.reposts;
create trigger reposts_count_ins after insert on public.reposts
  for each row execute function public.reposts_table_count_update();
create trigger reposts_count_del after delete on public.reposts
  for each row execute function public.reposts_table_count_update();

-- Recompute posts.reposts from the junction so the column lines up immediately.
-- (Strips out the old is_repost / original_post_id counts, which we no longer use.)
update public.posts p
set reposts = (select count(*) from public.reposts r where r.post_id = p.id);

-- ============================================================
-- bump_views_batch: increments views for an array of post ids
-- in one round-trip. Used by Feed on load.
-- ============================================================
create or replace function public.bump_views_batch(post_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set views = coalesce(views, 0) + 1
  where id = any(post_ids);
end;
$$;

revoke all on function public.bump_views_batch(uuid[]) from public;
grant execute on function public.bump_views_batch(uuid[]) to anon, authenticated;
