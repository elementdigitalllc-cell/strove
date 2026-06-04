-- ============================================================
-- Strove: read receipts. Adds messages.read_at, which is set
-- whenever is_read flips from false to true.
-- Safe to re-run.
-- ============================================================

alter table public.messages
  add column if not exists read_at timestamp;

-- Trigger: stamp read_at the instant a row goes from unread to read.
create or replace function public.stamp_message_read_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.is_read = true and (OLD.is_read = false or OLD.is_read is null)
     and NEW.read_at is null then
    NEW.read_at := now();
  end if;
  return NEW;
end;
$$;

drop trigger if exists stamp_message_read_at_upd on public.messages;
create trigger stamp_message_read_at_upd
  before update on public.messages
  for each row execute function public.stamp_message_read_at();

-- Backfill: anything currently marked read but missing a timestamp gets one
-- from created_at as a best-effort.
update public.messages
set read_at = created_at
where is_read = true and read_at is null;
