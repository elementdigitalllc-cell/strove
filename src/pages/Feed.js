import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { getFeedPosts, getFollowing, getRepostCountsByPost } from '../lib/sdb';
import PostCard from '../components/PostCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { LoadingBlock, ErrorBlock } from '../components/ui/States';

export default function Feed() {
  const { user } = useAuth();
  const [tab, setTab] = useState('discover');
  const [posts, setPosts] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [postsResult, followsResult] = await Promise.all([
      getFeedPosts(),
      user ? getFollowing(user.id) : Promise.resolve({ data: [] }),
    ]);
    if (postsResult.error) {
      setError(postsResult.error);
    } else {
      const fetched = postsResult.data || [];
      // Count reposts from the junction table and merge into each post.
      const ids = fetched.map((p) => p.id);
      const { data: repostCounts } = await getRepostCountsByPost(ids);
      const merged = fetched.map((p) => ({
        ...p,
        reposts: repostCounts[p.id] || 0,
      }));
      setPosts(merged);
    }
    setFollowing(followsResult.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    if (tab === 'following') {
      return posts.filter((p) => following.includes(p.user_id) || p.user_id === user?.id);
    }
    return posts;
  }, [posts, following, tab, user]);

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
            <FeedList posts={visible} tab={tab} />
          )}
        </TabsContent>

        <TabsContent value="following" className="mt-2">
          {loading ? <LoadingBlock label="Loading feed…" /> : error ? (
            <div className="mx-4"><ErrorBlock error={error} onRetry={load} /></div>
          ) : (
            <FeedList posts={visible} tab={tab} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FeedList({ posts, tab }) {
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
  return <div>{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>;
}
