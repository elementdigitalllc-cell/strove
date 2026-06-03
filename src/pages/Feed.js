import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { getFeedPosts, getFollowing, getAllProfiles, follow, unfollow } from '../lib/sdb';
import PostCard from '../components/PostCard';
import { Avatar } from '../components/ui/Avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { LoadingBlock, ErrorBlock } from '../components/ui/States';
import { cn } from '../lib/cn';

export default function Feed() {
  const { user } = useAuth();
  const [tab, setTab] = useState('discover');
  const [posts, setPosts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [postsResult, profilesResult, followsResult] = await Promise.all([
      getFeedPosts(),
      getAllProfiles(),
      user ? getFollowing(user.id) : Promise.resolve({ data: [] }),
    ]);
    if (postsResult.error) {
      setError(postsResult.error);
    } else {
      setPosts(postsResult.data);
    }
    setProfiles(profilesResult.data || []);
    setFollowing(followsResult.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function toggleFollow(targetId) {
    const isFollowing = following.includes(targetId);
    if (isFollowing) {
      const { error } = await unfollow(user.id, targetId);
      if (!error) setFollowing((p) => p.filter((id) => id !== targetId));
    } else {
      const { error } = await follow(user.id, targetId);
      if (!error) setFollowing((p) => [...p, targetId]);
    }
  }

  const visible = useMemo(() => {
    if (tab === 'following') {
      return posts.filter((p) => following.includes(p.user_id) || p.user_id === user?.id);
    }
    return posts;
  }, [posts, following, tab, user]);

  const suggested = profiles
    .filter((p) => p.id !== user?.id && !following.includes(p.id))
    .slice(0, 8);

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
            <>
              {suggested.length > 0 ? (
                <SuggestedRail users={suggested} follows={following} onFollow={toggleFollow} />
              ) : null}
              <FeedList posts={visible} tab={tab} />
            </>
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

function SuggestedRail({ users, follows, onFollow }) {
  return (
    <section className="border-b border-border pb-3 pt-3 px-4">
      <div className="flex items-baseline justify-between mb-2.5">
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted">Suggested for you</h3>
        <span className="text-[11px] text-muted">Builders · athletes · founders</span>
      </div>
      <div className="-mx-4 px-4 flex gap-2.5 overflow-x-auto snap-x snap-mandatory no-scrollbar">
        {users.map((u) => (
          <article key={u.id} className="snap-start shrink-0 w-[150px] bg-card border border-border rounded-2xl p-3.5 flex flex-col items-center gap-1.5 text-center">
            <Link to={'/profile/' + u.id}>
              <Avatar name={u.username || '?'} size="lg" gradient />
            </Link>
            <Link to={'/profile/' + u.id} className="text-[13px] font-bold text-fg leading-tight">
              {u.full_name || u.username}
            </Link>
            <div className="text-[11px] text-muted font-normal">@{u.username}</div>
            <div className="text-[12px] font-bold text-orange-400">🔥 {u.streak_count || 0}</div>
            <button
              onClick={() => onFollow(u.id)}
              className={cn(
                'mt-1.5 w-full text-[12px] font-bold py-1.5 rounded-full',
                follows.includes(u.id)
                  ? 'border border-border text-muted'
                  : 'bg-orange-grad text-black shadow-[0_4px_14px_-4px_rgba(249,115,22,0.4)]'
              )}
            >
              {follows.includes(u.id) ? 'Following' : 'Follow'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function FeedList({ posts, tab }) {
  if (posts.length === 0) {
    return (
      <div className="mx-4 mt-6 rounded-3xl border border-border bg-card p-9 text-center flex flex-col items-center gap-2">
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
