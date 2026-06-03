import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Repeat2, Heart, Eye, Share } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { bumpPostInt, follow, unfollow, getFollowing } from '../lib/sdb';
import { Avatar } from './ui/Avatar';
import { StreakPill } from './ui/Pill';
import { cn } from '../lib/cn';

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h';
  const d = Math.floor(h / 24);
  if (d < 7) return d + 'd';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCount(n) {
  const v = n || 0;
  if (v < 1000) return String(v);
  if (v < 1_000_000) return (v / 1000).toFixed(v < 10_000 ? 1 : 0).replace(/\.0$/, '') + 'K';
  return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
}

// Per-session local memory of which posts the current user already bumped
const LIKED_KEY = 'strove.localLiked';
const REPOSTED_KEY = 'strove.localReposted';
const VIEWED_KEY = 'strove.localViewed';
function readSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); }
}
function writeSet(key, set) { localStorage.setItem(key, JSON.stringify([...set])); }

export default function PostCard({ post: initial }) {
  const { user } = useAuth();
  const [post, setPost] = useState(initial);
  const [following, setFollowing] = useState(false);
  const [liked, setLiked] = useState(() => readSet(LIKED_KEY).has(initial.id));
  const [reposted, setReposted] = useState(() => readSet(REPOSTED_KEY).has(initial.id));
  const articleRef = useRef(null);
  const viewedRef = useRef(false);

  useEffect(() => setPost(initial), [initial]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const { data } = await getFollowing(user.id);
      if (!cancelled) setFollowing(data.includes(post.user_id));
    })();
    return () => { cancelled = true; };
  }, [user, post.user_id]);

  useEffect(() => {
    if (!articleRef.current || !user || post.user_id === user.id) return;
    const viewed = readSet(VIEWED_KEY);
    if (viewed.has(post.id)) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(async (e) => {
        if (e.isIntersecting && !viewedRef.current) {
          viewedRef.current = true;
          viewed.add(post.id);
          writeSet(VIEWED_KEY, viewed);
          const { data, error } = await bumpPostInt(post.id, 'views');
          if (!error && data) setPost((p) => ({ ...p, views: data.views }));
          obs.disconnect();
        }
      });
    }, { threshold: 0.5 });
    obs.observe(articleRef.current);
    return () => obs.disconnect();
  }, [post.id, post.user_id, user]);

  async function tapLike() {
    if (liked) return;
    const { data, error } = await bumpPostInt(post.id, 'likes');
    if (error) return;
    const s = readSet(LIKED_KEY); s.add(post.id); writeSet(LIKED_KEY, s);
    setLiked(true);
    if (data) setPost((p) => ({ ...p, likes: data.likes }));
  }

  async function tapRepost() {
    if (reposted) return;
    const { data, error } = await bumpPostInt(post.id, 'reposts');
    if (error) return;
    const s = readSet(REPOSTED_KEY); s.add(post.id); writeSet(REPOSTED_KEY, s);
    setReposted(true);
    if (data) setPost((p) => ({ ...p, reposts: data.reposts }));
  }

  function share() {
    const url = window.location.origin + '/profile/' + post.user_id;
    if (navigator.share) navigator.share({ text: post.content, url }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(post.content + '\n' + url).catch(() => {});
  }

  async function toggleFollow() {
    if (following) {
      await unfollow(user.id, post.user_id);
      setFollowing(false);
    } else {
      await follow(user.id, post.user_id);
      setFollowing(true);
    }
  }

  const author = post.profiles || {};
  const isOwn = post.user_id === user?.id;
  const displayName = author.full_name || author.username || 'Unknown';

  const Action = ({ icon: Icon, value, active, color, onClick, ariaLabel }) => (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-fg transition-colors',
        active && color
      )}
    >
      <span className={cn('grid place-items-center h-7 w-7 rounded transition-colors', active && 'bg-current/10')}>
        <Icon size={17} strokeWidth={1.8} fill={active ? 'currentColor' : 'none'} />
      </span>
      <span className="tabular-nums">{formatCount(value)}</span>
    </button>
  );

  return (
    <article ref={articleRef} className="flex gap-3 px-4 py-4 border-b border-border">
      <Link to={'/profile/' + post.user_id}>
        <Avatar name={displayName} size="md" />
      </Link>
      <div className="flex-1 min-w-0">
        <header className="flex items-center gap-1.5 flex-wrap text-sm">
          <Link to={'/profile/' + post.user_id} className="font-bold text-fg hover:underline">{displayName}</Link>
          <StreakPill count={author.streak_count || 0} />
          <Link to={'/profile/' + post.user_id} className="text-muted font-medium">@{author.username}</Link>
          <span className="text-muted">·</span>
          <span className="text-muted">{timeAgo(post.created_at)}</span>
          {!isOwn && user ? (
            <button
              onClick={toggleFollow}
              className={cn(
                'ml-auto px-3 py-1 text-xs font-bold rounded transition-colors',
                following
                  ? 'bg-transparent text-muted border border-border hover:text-rose-300 hover:border-rose-500/40'
                  : 'bg-fg text-bg hover:brightness-95'
              )}
            >
              {following ? 'Following' : 'Follow'}
            </button>
          ) : null}
        </header>

        {post.content ? (
          <p className="my-1.5 text-[15px] leading-[1.45] whitespace-pre-wrap break-words text-fg font-normal">{post.content}</p>
        ) : null}

        <div className="mt-2 pt-2.5 border-t border-border flex items-center justify-between max-w-[460px]">
          <Action icon={MessageCircle} value={0} ariaLabel="Comment" />
          <Action icon={Repeat2} value={post.reposts || 0} active={reposted} color="text-emerald-400" onClick={tapRepost} ariaLabel="Repost" />
          <Action icon={Heart} value={post.likes || 0} active={liked} color="text-rose-400" onClick={tapLike} ariaLabel="Like" />
          <Action icon={Eye} value={post.views || 0} ariaLabel="Views" />
          <Action icon={Share} value={0} onClick={share} ariaLabel="Share" />
        </div>
      </div>
    </article>
  );
}
