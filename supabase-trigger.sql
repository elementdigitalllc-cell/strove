-- =====================================================================
-- Strove: auth.users trigger + RLS policies + counter RPC.
-- Run this in the Supabase SQL editor AFTER supabase-setup.sql.
-- Safe to re-run (uses IF EXISTS / OR REPLACE).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Trigger function: auto-create profile row on new auth user.
--    SECURITY DEFINER bypasses RLS for the insert.
--    Pulls full_name + username from raw_user_meta_data set by signUp().
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2) RPC: bump a post counter (likes / reposts / views).
--    SECURITY DEFINER so any authenticated user can increment another
--    user's post counts without violating RLS update rules.
-- ---------------------------------------------------------------------
create or replace function public.bump_post(post_id uuid, field text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if field not in ('likes', 'reposts', 'views') then
    raise exception 'Invalid field: %', field;
  end if;
  execute format('update public.posts set %I = coalesce(%I, 0) + 1 where id = $1', field, field)
    using post_id;
end;
$$;

grant execute on function public.bump_post(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) Row Level Security: enable on every table + permissive read.
--    Each user can only mutate rows that belong to them.
-- ---------------------------------------------------------------------

-- profiles
alter table public.profiles enable row level security;
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_all"  on public.profiles for select using (true);
create policy "profiles_update_own"  on public.profiles for update using (auth.uid() = id);

-- posts (insert + edit own; reads public; counter bumps go through bump_post RPC)
alter table public.posts enable row level security;
drop policy if exists "posts_select_all"  on public.posts;
drop policy if exists "posts_insert_own"  on public.posts;
drop policy if exists "posts_update_own"  on public.posts;
drop policy if exists "posts_delete_own"  on public.posts;
create policy "posts_select_all" on public.posts for select using (true);
create policy "posts_insert_own" on public.posts for insert with check (auth.uid() = user_id);
create policy "posts_update_own" on public.posts for update using (auth.uid() = user_id);
create policy "posts_delete_own" on public.posts for delete using (auth.uid() = user_id);

-- follows
alter table public.follows enable row level security;
drop policy if exists "follows_select_all" on public.follows;
drop policy if exists "follows_insert_own" on public.follows;
drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_select_all"  on public.follows for select using (true);
create policy "follows_insert_own"  on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete_own"  on public.follows for delete using (auth.uid() = follower_id);

-- journal_notes (private — only owner sees)
alter table public.journal_notes enable row level security;
drop policy if exists "notes_select_own" on public.journal_notes;
drop policy if exists "notes_insert_own" on public.journal_notes;
drop policy if exists "notes_update_own" on public.journal_notes;
drop policy if exists "notes_delete_own" on public.journal_notes;
create policy "notes_select_own" on public.journal_notes for select using (auth.uid() = user_id);
create policy "notes_insert_own" on public.journal_notes for insert with check (auth.uid() = user_id);
create policy "notes_update_own" on public.journal_notes for update using (auth.uid() = user_id);
create policy "notes_delete_own" on public.journal_notes for delete using (auth.uid() = user_id);

-- pot_entries
alter table public.pot_entries enable row level security;
drop policy if exists "pot_select_all" on public.pot_entries;
drop policy if exists "pot_insert_own" on public.pot_entries;
drop policy if exists "pot_update_own" on public.pot_entries;
drop policy if exists "pot_delete_own" on public.pot_entries;
create policy "pot_select_all"  on public.pot_entries for select using (true);
create policy "pot_insert_own"  on public.pot_entries for insert with check (auth.uid() = user_id);
create policy "pot_update_own"  on public.pot_entries for update using (auth.uid() = user_id);
create policy "pot_delete_own"  on public.pot_entries for delete using (auth.uid() = user_id);

-- votes
alter table public.votes enable row level security;
drop policy if exists "votes_select_all" on public.votes;
drop policy if exists "votes_insert_own" on public.votes;
drop policy if exists "votes_delete_own" on public.votes;
create policy "votes_select_all" on public.votes for select using (true);
create policy "votes_insert_own" on public.votes for insert with check (auth.uid() = voter_id);
create policy "votes_delete_own" on public.votes for delete using (auth.uid() = voter_id);
