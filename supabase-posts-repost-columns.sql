-- ============================================================
-- Strove: ensure posts has the columns reposts depends on.
-- Safe to re-run.
-- ============================================================

alter table public.posts
  add column if not exists reposts int default 0,
  add column if not exists views int default 0,
  add column if not exists original_post_id uuid references public.posts(id) on delete set null,
  add column if not exists is_repost boolean default false;

create index if not exists posts_original_post_id_idx on public.posts(original_post_id);

-- Quick sanity check (run separately if you want):
-- select column_name, data_type, column_default
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'posts'
-- order by ordinal_position;
