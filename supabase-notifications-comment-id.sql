-- ============================================================
-- Strove: link notifications to the specific comment they were
-- triggered by, so the panel can deep-link to it.
-- Safe to re-run.
-- ============================================================

alter table public.notifications
  add column if not exists comment_id uuid
  references public.comments(id) on delete cascade;

create index if not exists notifications_comment_id_idx
  on public.notifications(comment_id);
