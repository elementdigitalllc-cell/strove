-- ============================================================
-- Strove: allow any authenticated user to UPDATE posts.
-- This is required for the simple
--   supabase.from('posts').update({ views: ... }).eq('id', ...)
-- in PostCard to actually persist for posts the user does not own.
--
-- TRADEOFF: this policy is permissive — it allows any logged-in
-- user to update any column on any post. If you'd rather keep
-- owner-only writes for content fields, revert to the previous
-- posts_update_own policy and bump views through an RPC instead.
-- ============================================================

drop policy if exists "posts_update_own" on public.posts;
drop policy if exists "posts_update_any" on public.posts;

create policy "posts_update_any"
  on public.posts
  for update
  to authenticated
  using (true)
  with check (true);
