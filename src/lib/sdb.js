import { supabase } from '../supabaseClient';

/* ============ Profiles ============ */

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  return { data, error };
}

export async function getProfileByUsername(username) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', username)
    .maybeSingle();
  return { data, error };
}

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('joined_at', { ascending: false });
  return { data: data || [], error };
}

export async function createProfile({ id, username, full_name }) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id, username, full_name })
    .select()
    .single();
  return { data, error };
}

export async function updateProfile(userId, patch) {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();
  return { data, error };
}

/* ============ Posts ============ */

export async function getFeedPosts(limit = 50) {
  // Pull originals + reposts in parallel and stitch into a single, sorted feed.
  const [postsRes, repostsRes] = await Promise.all([
    supabase
      .from('posts')
      .select('*, profiles:profiles!posts_user_id_fkey (id, username, full_name, streak_count)')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('reposts')
      .select('user_id, post_id, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  if (postsRes.error) return { data: [], error: postsRes.error };

  const posts = postsRes.data || [];
  const reposts = repostsRes.data || [];

  // Fetch any posts referenced by reposts that we don't already have, plus
  // profile rows for the reposters themselves.
  const knownPostIds = new Set(posts.map((p) => p.id));
  const missingPostIds = [
    ...new Set(reposts.map((r) => r.post_id).filter((id) => !knownPostIds.has(id))),
  ];
  const reposterIds = [...new Set(reposts.map((r) => r.user_id))];

  const [missingPostsRes, reposterProfilesRes] = await Promise.all([
    missingPostIds.length
      ? supabase
          .from('posts')
          .select('*, profiles:profiles!posts_user_id_fkey (id, username, full_name, streak_count)')
          .in('id', missingPostIds)
      : Promise.resolve({ data: [] }),
    reposterIds.length
      ? supabase
          .from('profiles')
          .select('id, username, full_name, streak_count')
          .in('id', reposterIds)
      : Promise.resolve({ data: [] }),
  ]);

  const postMap = new Map();
  for (const p of posts) postMap.set(p.id, p);
  for (const p of missingPostsRes.data || []) postMap.set(p.id, p);
  const profileMap = new Map();
  for (const p of reposterProfilesRes.data || []) profileMap.set(p.id, p);

  const repostItems = reposts
    .map((r) => {
      const original = postMap.get(r.post_id);
      if (!original) return null;
      return {
        ...original,
        feed_id: `repost-${r.user_id}-${r.post_id}`,
        is_repost: true,
        repost_by: profileMap.get(r.user_id) || null,
        repost_at: r.created_at,
        display_at: r.created_at,
      };
    })
    .filter(Boolean);

  const postItems = posts.map((p) => ({
    ...p,
    feed_id: p.id,
    is_repost: false,
    repost_by: null,
    repost_at: null,
    display_at: p.created_at,
  }));

  const combined = [...postItems, ...repostItems]
    .sort((a, b) => new Date(b.display_at) - new Date(a.display_at))
    .slice(0, limit);

  return { data: combined, error: null };
}

export async function getPostsByUser(userId) {
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles:profiles!posts_user_id_fkey (id, username, full_name, streak_count)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function createPost({ user_id, content }) {
  const { data, error } = await supabase
    .from('posts')
    .insert({ user_id, content })
    .select('*, profiles:profiles!posts_user_id_fkey (id, username, full_name, streak_count)')
    .single();
  return { data, error };
}

/* ============ Notifications ============ */

export async function createNotification({ user_id, actor_id, type, post_id = null }) {
  console.log('[sdb.createNotification] called with args =', { user_id, actor_id, type, post_id });

  if (!user_id || !actor_id) {
    console.warn('[sdb.createNotification] skip: missing user_id or actor_id');
    return { error: null };
  }
  if (user_id === actor_id) {
    console.log('[sdb.createNotification] skip: self-notification');
    return { error: null };
  }

  // What does the auth layer think the current user is? RLS check
  // `auth.uid() = actor_id` will fail if these don't match.
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const authUid = sessionData?.session?.user?.id || null;
  console.log('[sdb.createNotification] supabase auth uid =', authUid, sessionError ? 'sessionError=' + sessionError.message : '');
  if (authUid !== actor_id) {
    console.warn(
      '[sdb.createNotification] WARNING: actor_id !== auth.uid(); RLS will reject this insert',
      { actor_id, authUid }
    );
  }

  const payload = { user_id, actor_id, type, post_id };
  console.log('[sdb.createNotification] inserting payload =', JSON.stringify(payload, null, 2));

  const response = await supabase
    .from('notifications')
    .insert(payload)
    .select('id, user_id, actor_id, type, post_id, created_at, is_read')
    .single();

  console.log(
    '[sdb.createNotification] full supabase response =',
    JSON.stringify(
      {
        data: response.data,
        error: response.error
          ? {
              message: response.error.message,
              code: response.error.code,
              details: response.error.details,
              hint: response.error.hint,
            }
          : null,
        status: response.status,
        statusText: response.statusText,
      },
      null,
      2
    )
  );

  return { error: response.error };
}

export async function getMyNotifications(userId, limit = 50) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey (id, username, full_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: data || [], error };
}

export async function getUnreadNotificationCount(userId) {
  if (!userId) return { count: 0, error: null };
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  return { count: count || 0, error };
}

export async function markAllNotificationsRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  return { error };
}

/* ============ Likes ============ */

export async function likePost(userId, postId) {
  // posts.likes is bumped by the likes_count_ins trigger. Do not double-count
  // by calling change_post_count here.
  const { error } = await supabase
    .from('likes')
    .insert({ user_id: userId, post_id: postId });
  if (error) console.error('[sdb.likePost] insert error:', error);
  return { error };
}

export async function unlikePost(userId, postId) {
  // posts.likes is decremented by the likes_count_del trigger.
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('user_id', userId)
    .eq('post_id', postId);
  if (error) console.error('[sdb.unlikePost] delete error:', error);
  return { error };
}

export async function getLikedPostIds(userId) {
  const { data, error } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', userId);
  return { data: (data || []).map((r) => r.post_id), error };
}

/* ============ Reposts ============ */

export async function repostPost({ user_id, post_id }) {
  console.log('[sdb.repostPost] inserting reposts row', { user_id, post_id });
  const { error } = await supabase
    .from('reposts')
    .insert({ user_id, post_id });
  if (error) {
    console.error('[sdb.repostPost] insert error:', error);
    return { error };
  }
  // posts.reposts is bumped by the reposts trigger (server side).
  return { error: null };
}

export async function unrepost(userId, postId) {
  console.log('[sdb.unrepost] deleting reposts row', { userId, postId });
  const { error } = await supabase
    .from('reposts')
    .delete()
    .eq('user_id', userId)
    .eq('post_id', postId);
  if (error) console.error('[sdb.unrepost] delete error:', error);
  return { error };
}

export async function getRepostedOriginalIds(userId) {
  const { data, error } = await supabase
    .from('reposts')
    .select('post_id')
    .eq('user_id', userId);
  return { data: (data || []).map((r) => r.post_id), error };
}

export async function getRepostCountsByPost(postIds) {
  if (!postIds || postIds.length === 0) return { data: {}, error: null };
  const { data, error } = await supabase
    .from('reposts')
    .select('post_id')
    .in('post_id', postIds);
  if (error) {
    console.error('[sdb.getRepostCountsByPost] error:', error);
    return { data: {}, error };
  }
  const counts = {};
  for (const row of data || []) {
    counts[row.post_id] = (counts[row.post_id] || 0) + 1;
  }
  return { data: counts, error: null };
}

export async function bumpViewsBatch(postIds) {
  if (!postIds || postIds.length === 0) return { error: null };
  const { error } = await supabase.rpc('bump_views_batch', { post_ids: postIds });
  if (error) console.error('[sdb.bumpViewsBatch] error:', error);
  return { error };
}

/* ============ Comments ============ */

export async function listComments(postId) {
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles:profiles!comments_user_id_fkey (id, username, full_name)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  return { data: data || [], error };
}

export async function createComment({ post_id, user_id, content }) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id, user_id, content })
    .select('*, profiles:profiles!comments_user_id_fkey (id, username, full_name)')
    .single();
  return { data, error };
}

export async function deleteComment(commentId) {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  return { error };
}

/* ============ Saved posts (bookmarks) ============ */

export async function savePost(userId, postId) {
  const { error } = await supabase
    .from('saved_posts')
    .insert({ user_id: userId, post_id: postId });
  return { error };
}

export async function unsavePost(userId, postId) {
  const { error } = await supabase
    .from('saved_posts')
    .delete()
    .eq('user_id', userId)
    .eq('post_id', postId);
  return { error };
}

export async function getSavedPostIds(userId) {
  const { data, error } = await supabase
    .from('saved_posts')
    .select('post_id')
    .eq('user_id', userId);
  return { data: (data || []).map((r) => r.post_id), error };
}

export async function getSavedPosts(userId) {
  const { data, error } = await supabase
    .from('saved_posts')
    .select('post_id, created_at, posts:posts!saved_posts_post_id_fkey (*, profiles:profiles!posts_user_id_fkey (id, username, full_name, streak_count))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data: (data || []).map((r) => r.posts).filter(Boolean), error };
}

export async function bumpPostInt(postId, field) {
  // Uses SECURITY DEFINER RPC so RLS doesn't block non-owner increments.
  const { error: rpcError } = await supabase.rpc('bump_post', {
    post_id: postId,
    field,
  });
  if (rpcError) return { data: null, error: rpcError };
  const { data, error } = await supabase
    .from('posts')
    .select('id, ' + field)
    .eq('id', postId)
    .single();
  return { data, error };
}

/* ============ Follows ============ */

export async function getFollowing(userId) {
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);
  return { data: (data || []).map((r) => r.following_id), error };
}

export async function getFollowers(targetId) {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', targetId);
  return { data: (data || []).map((r) => r.follower_id), error };
}

export async function follow(followerId, followingId) {
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId });
  return { error };
}

export async function unfollow(followerId, followingId) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  return { error };
}

/* ============ Journal notes ============ */

export async function getJournalNotes(userId) {
  const { data, error } = await supabase
    .from('journal_notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function addJournalNote(userId, content) {
  const { data, error } = await supabase
    .from('journal_notes')
    .insert({ user_id: userId, content })
    .select()
    .single();
  return { data, error };
}

export async function updateJournalNote(noteId, content) {
  const { data, error } = await supabase
    .from('journal_notes')
    .update({ content })
    .eq('id', noteId)
    .select()
    .single();
  return { data, error };
}

export async function deleteJournalNote(noteId) {
  const { error } = await supabase
    .from('journal_notes')
    .delete()
    .eq('id', noteId);
  return { error };
}

/* ============ Pot entries ============ */

function currentMonthYear() {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export async function getMyPotEntry(userId) {
  const { month, year } = currentMonthYear();
  const { data, error } = await supabase
    .from('pot_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();
  return { data, error };
}

export async function getCurrentPotEntries() {
  const { month, year } = currentMonthYear();
  const { data, error } = await supabase
    .from('pot_entries')
    .select('*, profiles:profiles!pot_entries_user_id_fkey (id, username, full_name, streak_count)')
    .eq('month', month)
    .eq('year', year)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function enterPot(userId, why_i_should_win) {
  const { month, year } = currentMonthYear();
  const { data, error } = await supabase
    .from('pot_entries')
    .insert({ user_id: userId, why_i_should_win, month, year })
    .select()
    .single();
  return { data, error };
}

export async function updatePotEntryWhy(userId, why_i_should_win) {
  const { month, year } = currentMonthYear();
  const { data, error } = await supabase
    .from('pot_entries')
    .update({ why_i_should_win })
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .select()
    .single();
  return { data, error };
}

/* ============ Votes ============ */

export async function getMyVote(voterId) {
  const { month, year } = currentMonthYear();
  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('voter_id', voterId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();
  return { data, error };
}

export async function castVote(voterId, candidateId) {
  const { month, year } = currentMonthYear();
  // Wipe any prior vote for this voter/month first
  await supabase
    .from('votes')
    .delete()
    .eq('voter_id', voterId)
    .eq('month', month)
    .eq('year', year);
  const { data, error } = await supabase
    .from('votes')
    .insert({ voter_id: voterId, candidate_id: candidateId, month, year })
    .select()
    .single();
  return { data, error };
}

export async function clearMyVote(voterId) {
  const { month, year } = currentMonthYear();
  const { error } = await supabase
    .from('votes')
    .delete()
    .eq('voter_id', voterId)
    .eq('month', month)
    .eq('year', year);
  return { error };
}

export async function getVoteTallies() {
  const { month, year } = currentMonthYear();
  const { data, error } = await supabase
    .from('votes')
    .select('candidate_id')
    .eq('month', month)
    .eq('year', year);
  const tallies = {};
  (data || []).forEach((v) => {
    tallies[v.candidate_id] = (tallies[v.candidate_id] || 0) + 1;
  });
  return { data: tallies, error };
}
