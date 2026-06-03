-- ============================================================
-- Strove: pre-signup duplicate checks for phone + email.
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================

-- NOTE on phone storage: Supabase stores auth.users.phone in E.164
-- WITHOUT the leading "+" (e.g. "14155551234"). The replace() call
-- below normalizes the input the same way before comparing.

create or replace function public.check_phone_exists(phone_number text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1
    from auth.users
    where phone = replace(phone_number, '+', '')
  );
$$;

create or replace function public.check_email_exists(email_address text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1
    from auth.users
    where lower(email) = lower(email_address)
  );
$$;

revoke all on function public.check_phone_exists(text) from public;
revoke all on function public.check_email_exists(text) from public;
grant execute on function public.check_phone_exists(text) to anon, authenticated;
grant execute on function public.check_email_exists(text) to anon, authenticated;
