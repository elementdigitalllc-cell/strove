-- ============================================================
-- Strove: notifications table (follows / likes / comments / reposts).
-- Run after the other SQL files. Safe to re-run.
-- ============================================================

create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,   -- recipient
  actor_id uuid references public.profiles(id) on delete cascade,  -- who did it
  type text not null,                                              -- 'follow' | 'like' | 'comment' | 'repost'
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamp default now(),
  is_read boolean default false
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_unread_idx on public.notifications(user_id) where is_read = false;

alter table public.notifications enable row level security;

drop policy if exists "notifs_select_own" on public.notifications;
drop policy if exists "notifs_insert_actor" on public.notifications;
drop policy if exists "notifs_update_own" on public.notifications;
drop policy if exists "notifs_delete_own" on public.notifications;

create policy "notifs_select_own"   on public.notifications for select using (auth.uid() = user_id);
create policy "notifs_insert_actor" on public.notifications for insert with check (auth.uid() = actor_id);
create policy "notifs_update_own"   on public.notifications for update using (auth.uid() = user_id);
create policy "notifs_delete_own"   on public.notifications for delete using (auth.uid() = user_id);
