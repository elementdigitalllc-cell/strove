-- ============================================================
-- Strove: direct messages (conversations + messages).
-- Run after the prior SQL files. Safe to re-run.
-- ============================================================

-- ---------------------------------------------------------
-- 1) conversations: one row per ordered pair (participant_1 < participant_2)
-- ---------------------------------------------------------
create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  participant_1 uuid not null references public.profiles(id) on delete cascade,
  participant_2 uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp default now(),
  last_message_at timestamp default now(),
  check (participant_1 < participant_2),
  unique (participant_1, participant_2)
);

create index if not exists conversations_participant_1_idx on public.conversations(participant_1);
create index if not exists conversations_participant_2_idx on public.conversations(participant_2);
create index if not exists conversations_last_message_idx on public.conversations(last_message_at desc);

-- ---------------------------------------------------------
-- 2) messages
-- ---------------------------------------------------------
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamp default now(),
  is_read boolean default false
);

create index if not exists messages_conversation_id_idx on public.messages(conversation_id, created_at);

-- Bump conversations.last_message_at whenever a message lands.
create or replace function public.bump_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = NEW.created_at
  where id = NEW.conversation_id;
  return NEW;
end;
$$;

drop trigger if exists bump_conversation_last_message_ins on public.messages;
create trigger bump_conversation_last_message_ins after insert on public.messages
  for each row execute function public.bump_conversation_last_message();

-- ---------------------------------------------------------
-- 3) Row Level Security
-- ---------------------------------------------------------
alter table public.conversations enable row level security;
drop policy if exists "conversations_select_own" on public.conversations;
drop policy if exists "conversations_insert_own" on public.conversations;
drop policy if exists "conversations_delete_own" on public.conversations;

create policy "conversations_select_own" on public.conversations for select
  using (auth.uid() = participant_1 or auth.uid() = participant_2);
create policy "conversations_insert_own" on public.conversations for insert
  with check (auth.uid() = participant_1 or auth.uid() = participant_2);
create policy "conversations_delete_own" on public.conversations for delete
  using (auth.uid() = participant_1 or auth.uid() = participant_2);

alter table public.messages enable row level security;
drop policy if exists "messages_select_own" on public.messages;
drop policy if exists "messages_insert_own" on public.messages;
drop policy if exists "messages_update_own" on public.messages;

create policy "messages_select_own" on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

create policy "messages_insert_own" on public.messages for insert
  with check (
    auth.uid() = sender_id and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

create policy "messages_update_own" on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

-- After running this, also enable Realtime for public.messages in the
-- Supabase dashboard (Database → Replication → enable for messages).
