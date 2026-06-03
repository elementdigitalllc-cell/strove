-- ============================================================
-- Strove: expose email + phone on profiles so the client can
-- resolve username -> email/phone for login WITHOUT an RPC.
-- Run AFTER supabase-setup.sql and supabase-trigger.sql.
-- Safe to re-run.
-- ============================================================

alter table public.profiles
  add column if not exists email text,
  add column if not exists phone text;

-- Backfill existing rows from auth.users.
update public.profiles p
set
  email = coalesce(p.email, u.email),
  phone = coalesce(p.phone, u.phone)
from auth.users u
where u.id = p.id;

-- Updated trigger: store email + phone from auth.users (and from
-- raw_user_meta_data for phone-signup back-compat).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.phone, new.raw_user_meta_data->>'phone')
  )
  on conflict (id) do update
    set
      email = coalesce(excluded.email, public.profiles.email),
      phone = coalesce(excluded.phone, public.profiles.phone);
  return new;
end;
$$;

-- The old RPC is no longer used. Drop it if it exists.
drop function if exists public.get_email_for_username(text);
