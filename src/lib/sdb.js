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

/* ============ Direct messages ============ */

export async function getOrCreateConversation(userA, userB) {
  if (!userA || !userB || userA === userB) {
    return { data: null, error: new Error('Invalid participants.') };
  }
  const [a, b] = [userA, userB].sort();
  const { data: existing, error: lookupErr } = await supabase
    .from('conversations')
    .select('*')
    .eq('participant_1', a)
    .eq('participant_2', b)
    .maybeSingle();
  if (lookupErr) return { data: null, error: lookupErr };
  if (existing) return { data: existing, error: null };
  const { data, error } = await supabase
    .from('conversations')
    .insert({ participant_1: a, participant_2: b })
    .select('*')
    .single();
  return { data, error };
}

export async function listMyConversations(userId) {
  if (!userId) return { data: [], error: null };
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order('last_message_at', { ascending: false });
  if (error) return { data: [], error };
  const rows = data || [];
  if (rows.length === 0) return { data: [], error: null };

  const otherIds = [
    ...new Set(rows.map((c) => (c.participant_1 === userId ? c.participant_2 : c.participant_1))),
  ];
  const convIds = rows.map((c) => c.id);

  const [profilesRes, messagesRes] = await Promise.all([
    supabase.from('profiles').select('id, username, full_name').in('id', otherIds),
    supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at, is_read')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false }),
  ]);

  const profileMap = new Map((profilesRes.data || []).map((p) => [p.id, p]));
  const lastMessageMap = new Map();
  for (const m of messagesRes.data || []) {
    if (!lastMessageMap.has(m.conversation_id)) lastMessageMap.set(m.conversation_id, m);
  }

  return {
    data: rows.map((c) => {
      const otherId = c.participant_1 === userId ? c.participant_2 : c.participant_1;
      return {
        ...c,
        other: profileMap.get(otherId) || null,
        lastMessage: lastMessageMap.get(c.id) || null,
      };
    }),
    error: null,
  };
}

export async function getConversationById(conversationId, userId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle();
  if (error || !data) return { data: null, error };
  const otherId = data.participant_1 === userId ? data.participant_2 : data.participant_1;
  const { data: other } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .eq('id', otherId)
    .maybeSingle();
  return { data: { ...data, other: other || null }, error: null };
}

export async function listMessages(conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  return { data: data || [], error };
}

export async function sendMessage({ conversation_id, sender_id, content }) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id, sender_id, content })
    .select('*')
    .single();
  return { data, error };
}

export async function deleteConversation(conversationId) {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);
  return { error };
}

export async function getUnreadMessageCount(userId) {
  if (!userId) return { count: 0, error: null };
  const { data: convos, error: convosErr } = await supabase
    .from('conversations')
    .select('id')
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);
  if (convosErr) {
    console.error('[sdb.getUnreadMessageCount] conversations error:', convosErr);
    return { count: 0, error: convosErr };
  }
  const ids = [...new Set((convos || []).map((c) => c.id))];
  console.log('[sdb.getUnreadMessageCount] userId =', userId, 'convoIds =', ids);
  if (ids.length === 0) return { count: 0, error: null };
  const { data: rows, count, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, is_read', { count: 'exact' })
    .eq('is_read', false)
    .neq('sender_id', userId)
    .in('conversation_id', ids);
  if (error) console.error('[sdb.getUnreadMessageCount] messages error:', error);
  console.log(
    '[sdb.getUnreadMessageCount] raw count =', count,
    'rows.length =', rows?.length,
    'sample =', (rows || []).slice(0, 5)
  );
  return { count: count || 0, error };
}

export async function markConversationMessagesRead(conversationId, userId) {
  console.log('[sdb.markConversationMessagesRead] start', { conversationId, userId });
  const { data, error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('is_read', false)
    .select('id, is_read, read_at');
  if (error) console.error('[sdb.markConversationMessagesRead] error:', error);
  console.log(
    '[sdb.markConversationMessagesRead] updated',
    data?.length || 0,
    'rows; ids =',
    (data || []).map((r) => r.id)
  );
  return { error, updatedCount: data?.length || 0 };
}

export async function searchProfiles(query, limit = 20) {
  const q = (query || '').trim();
  if (!q) return { data: [], error: null };
  const pattern = '%' + q.replace(/[%_]/g, (m) => '\\' + m) + '%';
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, streak_count')
    .or('username.ilike.' + pattern + ',full_name.ilike.' + pattern)
    .limit(limit);
  return { data: data || [], error };
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
        repost_by: profileMap.get(r.user_id) || null,
        repost_at: r.created_at,
        display_at: r.created_at,
      };
    })
    .filter(Boolean);

  const postItems = posts.map((p) => ({
    ...p,
    feed_id: p.id,
    repost_by: null,
    repost_at: null,
    display_at: p.created_at,
  }));

  // One row per unique post.id. Most-recent entry wins, so if a repost is
  // newer than the original, the surviving row carries repost_by (header
  // renders) and original is dropped.
  const combined = [...postItems, ...repostItems].sort(
    (a, b) => new Date(b.display_at) - new Date(a.display_at)
  );

  const seen = new Set();
  const deduped = [];
  for (const item of combined) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }

  return { data: deduped.slice(0, limit), error: null };
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

export async function createNotification({ user_id, actor_id, type, post_id = null, comment_id = null }) {
  console.log('[sdb.createNotification] called with args =', { user_id, actor_id, type, post_id, comment_id });

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

  const payload = { user_id, actor_id, type, post_id, comment_id };
  console.log('[sdb.createNotification] inserting payload =', JSON.stringify(payload, null, 2));

  const response = await supabase
    .from('notifications')
    .insert(payload)
    .select('id, user_id, actor_id, type, post_id, comment_id, created_at, is_read')
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

export async function getMyNotifications(userId, limit = 20) {
  // 1) Pull notifications + actor profile.
  const { data: notifs, error } = await supabase
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey (id, username, full_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  console.log('[sdb.getMyNotifications] notifications =', notifs?.length, 'error =', error);
  if (error) return { data: [], error };

  const rows = notifs || [];

  // 2) One query for every post referenced by a notification.
  const postIds = [...new Set(rows.map((n) => n.post_id).filter(Boolean))];
  let postMap = new Map();
  if (postIds.length) {
    const { data: posts, error: postsErr } = await supabase
      .from('posts')
      .select('id, content')
      .in('id', postIds);
    console.log('[sdb.getMyNotifications] joined posts =', posts?.length, 'error =', postsErr);
    if (!postsErr) postMap = new Map((posts || []).map((p) => [p.id, p.content]));
  }

  // 3) Resolve comment content. Prefer notification.comment_id when set
  // (exact comment), fall back to legacy heuristic for older rows.
  const commentMap = new Map();
  const replyMap = new Map();
  const likedCommentMap = new Map();

  const directCommentIds = [
    ...new Set(
      rows
        .filter((n) => n.comment_id && ['comment', 'reply', 'comment_like'].includes(n.type))
        .map((n) => n.comment_id)
    ),
  ];
  const directCommentMap = new Map();
  if (directCommentIds.length) {
    const { data: directs } = await supabase
      .from('comments')
      .select('id, content')
      .in('id', directCommentIds);
    for (const c of directs || []) directCommentMap.set(c.id, c.content);
  }

  // Legacy fallback rows (no comment_id on the notification).
  const legacyActorNotifs = rows.filter(
    (n) => !n.comment_id && (n.type === 'comment' || n.type === 'reply') && n.post_id && n.actor_id
  );
  const legacyLikeNotifs = rows.filter(
    (n) => !n.comment_id && n.type === 'comment_like' && n.post_id && n.user_id
  );

  await Promise.all([
    ...legacyActorNotifs.map(async (n) => {
      const { data: c } = await supabase
        .from('comments')
        .select('content')
        .eq('post_id', n.post_id)
        .eq('user_id', n.actor_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (n.type === 'reply') replyMap.set(n.id, c?.content || null);
      else commentMap.set(n.id, c?.content || null);
    }),
    ...legacyLikeNotifs.map(async (n) => {
      const { data: c } = await supabase
        .from('comments')
        .select('content')
        .eq('post_id', n.post_id)
        .eq('user_id', n.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      likedCommentMap.set(n.id, c?.content || null);
    }),
  ]);

  return {
    data: rows.map((n) => {
      const direct = n.comment_id ? directCommentMap.get(n.comment_id) || null : null;
      return {
        ...n,
        post_content: n.post_id ? postMap.get(n.post_id) || null : null,
        comment_content:
          n.type === 'comment' ? (direct || commentMap.get(n.id) || null) : null,
        reply_content:
          n.type === 'reply' ? (direct || replyMap.get(n.id) || null) : null,
        liked_comment_content:
          n.type === 'comment_like' ? (direct || likedCommentMap.get(n.id) || null) : null,
      };
    }),
    error: null,
  };
}

export async function getPostById(postId) {
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles:profiles!posts_user_id_fkey (id, username, full_name, streak_count)')
    .eq('id', postId)
    .maybeSingle();
  return { data, error };
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

export async function markNotificationRead(notificationId) {
  if (!notificationId) return { error: null };
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  if (error) console.error('[sdb.markNotificationRead] error:', error);
  return { error };
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
  console.log('[sdb.getRepostedOriginalIds] called with userId =', userId);
  const { data, error } = await supabase
    .from('reposts')
    .select('post_id')
    .eq('user_id', userId);
  console.log('[sdb.getRepostedOriginalIds] raw response =', JSON.stringify({ data, error }, null, 2));
  const postIds = (data || []).map((r) => r.post_id);
  console.log('[sdb.getRepostedOriginalIds] returning post_ids =', postIds);
  return { data: postIds, error };
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
    .select('id, post_id, user_id, content, created_at, likes, parent_comment_id, profiles:profiles!comments_user_id_fkey (id, username, full_name)')
    .eq('post_id', postId)
    .order('likes', { ascending: false })
    .order('created_at', { ascending: true });
  return { data: data || [], error };
}

export async function createComment({ post_id, user_id, content, parent_comment_id = null }) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id, user_id, content, parent_comment_id })
    .select('id, post_id, user_id, content, created_at, likes, parent_comment_id, profiles:profiles!comments_user_id_fkey (id, username, full_name)')
    .single();
  return { data, error };
}

export async function likeComment(userId, commentId) {
  const { error } = await supabase
    .from('comment_likes')
    .insert({ user_id: userId, comment_id: commentId });
  if (error) console.error('[sdb.likeComment] error:', error);
  return { error };
}

export async function unlikeComment(userId, commentId) {
  const { error } = await supabase
    .from('comment_likes')
    .delete()
    .eq('user_id', userId)
    .eq('comment_id', commentId);
  if (error) console.error('[sdb.unlikeComment] error:', error);
  return { error };
}

export async function getLikedCommentIdsByPost(userId, postId) {
  if (!userId || !postId) return { data: [], error: null };
  const { data, error } = await supabase
    .from('comment_likes')
    .select('comment_id, comments!inner(post_id)')
    .eq('user_id', userId)
    .eq('comments.post_id', postId);
  if (error) console.error('[sdb.getLikedCommentIdsByPost] error:', error);
  return { data: (data || []).map((r) => r.comment_id), error };
}

export async function getCommentCountsByPost(postIds) {
  if (!postIds || postIds.length === 0) return { data: {}, error: null };
  const { data, error } = await supabase
    .from('comments')
    .select('post_id')
    .in('post_id', postIds);
  if (error) {
    console.error('[sdb.getCommentCountsByPost] error:', error);
    return { data: {}, error };
  }
  const counts = {};
  for (const row of data || []) {
    counts[row.post_id] = (counts[row.post_id] || 0) + 1;
  }
  return { data: counts, error: null };
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
