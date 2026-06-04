-- ============================================================
-- Strove: profile badges.
-- Stores opt-in badges per user as a text[]. Currently the only
-- badge id is 'strove' (founder badge). Add more badge ids by
-- writing more update statements below.
-- Safe to re-run.
-- ============================================================

alter table public.profiles
  add column if not exists badges text[] not null default '{}'::text[];

-- Founder badge: justin gets 'strove'.
update public.profiles
set badges = array_append(coalesce(badges, '{}'::text[]), 'strove')
where username = 'justin'
  and not ('strove' = any(coalesce(badges, '{}'::text[])));
