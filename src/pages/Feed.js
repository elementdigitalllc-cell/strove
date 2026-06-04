import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import {
  getFeedPosts,
  getFollowing,
  getRepostCountsByPost,
  getCommentCountsByPost,
  getLikedPostIds,
  getRepostedOriginalIds,
  follow,
  unfollow,
  createNotification,
} from '../lib/sdb';
import PostCard from '../components/PostCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { LoadingBlock, ErrorBlock } from '../components/ui/States';

export default function Feed() {
  const { user } = useAuth();
  const [tab, setTab] = useState('discover');
  const [posts, setPosts] = useState([]);
  const [followingSet, setFollowingSet] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      console.log('[Feed.load] skip: user not ready');
      return;
    }
    setLoading(true);
    setError(null);
    const [postsResult, followsResult, likedResult, repostedResult] = await Promise.all([
      getFeedPosts(),
      getFollowing(user.id),
      getLikedPostIds(user.id),
      getRepostedOriginalIds(user.id),
    ]);
    if (postsResult.error) {
      setError(postsResult.error);
    } else {
      const fetched = postsResult.data || [];
      const ids = fetched.map((p) => p.id);
      const [{ data: repostCounts }, { data: commentCounts }] = await Promise.all([
        getRepostCountsByPost(ids),
        getCommentCountsByPost(ids),
      ]);
      const likedSet = new Set(likedResult.data || []);
      const repostedSet = new Set(repostedResult.data || []);
      console.log('[Feed.load] repostedResult.data =', repostedResult.data);
      console.log('[Feed.load] currentUserId =', user?.id);
      console.log('[Feed.load] feed post ids =', fetched.map((p) => ({ id: p.id, feed_id: p.feed_id, repost_by: p.repost_by?.id || null })));
      const merged = fetched.map((p) => ({
        ...p,
        reposts: repostCounts[p.id] || 0,
        comments: commentCounts[p.id] || 0,
        currentUserLiked: likedSet.has(p.id),
        currentUserReposted: repostedSet.has(p.id),
      }));
      console.log(
        '[Feed.load] merged currentUserReposted map =',
        merged.map((p) => ({ feed_id: p.feed_id, post_id: p.id, currentUserReposted: p.currentUserReposted }))
      );
      setPosts(merged);
    }
    setFollowingSet(new Set(followsResult.data || []));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    // Reset stale per-user UI state immediately on account switch so we don't
    // flash the previous user's likes/reposts before the new fetch resolves.
    setPosts([]);
    setFollowingSet(new Set());
    if (!user?.id) return;
    load();
  }, [user?.id, load]);

  async function toggleFollow(targetId) {
    if (!user || targetId === user.id) return;
    const isFollowing = followingSet.has(targetId);
    if (isFollowing) {
      const { error: e } = await unfollow(user.id, targetId);
      if (e) return;
      setFollowingSet((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    } else {
      const { error: e } = await follow(user.id, targetId);
      if (e) return;
      setFollowingSet((prev) => {
        const next = new Set(prev);
        next.add(targetId);
        return next;
      });
      createNotification({ user_id: targetId, actor_id: user.id, type: 'follow' });
    }
  }

  const visible = useMemo(() => {
    if (tab === 'following') {
      return posts.filter((p) => {
        if (p.user_id === user?.id) return true;
        if (p.repost_by && followingSet.has(p.repost_by.id)) return true;
        if (followingSet.has(p.user_id)) return true;
        return false;
      });
    }
    return posts;
  }, [posts, followingSet, tab, user]);

  return (
    <div className="-mx-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="sticky top-[57px] z-10 bg-bg px-4">
          <TabsTrigger value="discover" className="flex-1">Discover</TabsTrigger>
          <TabsTrigger value="following" className="flex-1">Following</TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="mt-2">
          {loading ? <LoadingBlock label="Loading feed…" /> : error ? (
            <div className="mx-4"><ErrorBlock error={error} onRetry={load} /></div>
          ) : (
            <FeedList posts={visible} tab={tab} followingSet={followingSet} onToggleFollow={toggleFollow} />
          )}
        </TabsContent>

        <TabsContent value="following" className="mt-2">
          {loading ? <LoadingBlock label="Loading feed…" /> : error ? (
            <div className="mx-4"><ErrorBlock error={error} onRetry={load} /></div>
          ) : (
            <FeedList posts={visible} tab={tab} followingSet={followingSet} onToggleFollow={toggleFollow} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FeedList({ posts, tab, followingSet, onToggleFollow }) {
  if (posts.length === 0) {
    return (
      <div className="mx-4 mt-6 rounded border border-border bg-card p-9 text-center flex flex-col items-center gap-2">
        <div className="text-4xl">{tab === 'following' ? '👥' : '✨'}</div>
        <div className="font-bold">{tab === 'following' ? "It's quiet here" : 'No posts yet'}</div>
        <div className="text-sm text-muted font-normal max-w-[280px]">
          {tab === 'following' ? 'Follow people on Discover to fill your feed.' : 'Be the first to check in today.'}
        </div>
      </div>
    );
  }
  return (
    <div>
      {posts.map((p) => (
        <PostCard
          key={p.feed_id || p.id}
          post={p}
          isFollowing={followingSet.has(p.user_id)}
          onToggleFollow={onToggleFollow}
        />
      ))}
    </div>
  );
}
