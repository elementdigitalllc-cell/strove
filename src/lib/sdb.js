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
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles:profiles!posts_user_id_fkey (id, username, full_name, streak_count)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: data || [], error };
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

/* ============ Likes ============ */

async function changePostCount(postId, field, delta) {
  const { error } = await supabase.rpc('change_post_count', {
    post_id: postId,
    field,
    delta,
  });
  if (error) console.error('[sdb.changePostCount] error:', error);
  return { error };
}

export async function likePost(userId, postId) {
  const { error } = await supabase
    .from('likes')
    .insert({ user_id: userId, post_id: postId });
  if (error) {
    console.error('[sdb.likePost] insert error:', error);
    return { error };
  }
  await changePostCount(postId, 'likes', 1);
  return { error: null };
}

export async function unlikePost(userId, postId) {
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('user_id', userId)
    .eq('post_id', postId);
  if (error) {
    console.error('[sdb.unlikePost] delete error:', error);
    return { error };
  }
  await changePostCount(postId, 'likes', -1);
  return { error: null };
}

export async function getLikedPostIds(userId) {
  const { data, error } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', userId);
  return { data: (data || []).map((r) => r.post_id), error };
}

/* ============ Reposts ============ */

export async function repostPost({ user_id, original_post_id, content }) {
  console.log('[sdb.repostPost] inserting', { user_id, original_post_id });
  const { data, error } = await supabase
    .from('posts')
    .insert({ user_id, content, original_post_id, is_repost: true })
    .select('*, profiles:profiles!posts_user_id_fkey (id, username, full_name, streak_count)')
    .single();
  if (error) {
    console.error('[sdb.repostPost] insert error:', error);
    return { data, error };
  }
  await changePostCount(original_post_id, 'reposts', 1);
  console.log('[sdb.repostPost] success', { newRowId: data?.id });
  return { data, error: null };
}

export async function unrepost(userId, originalPostId) {
  console.log('[sdb.unrepost] deleting', { userId, originalPostId });
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('user_id', userId)
    .eq('original_post_id', originalPostId);
  if (error) {
    console.error('[sdb.unrepost] delete error:', error);
    return { error };
  }
  await changePostCount(originalPostId, 'reposts', -1);
  return { error: null };
}

export async function getRepostedOriginalIds(userId) {
  const { data, error } = await supabase
    .from('posts')
    .select('original_post_id')
    .eq('user_id', userId)
    .not('original_post_id', 'is', null);
  return { data: (data || []).map((r) => r.original_post_id), error };
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
