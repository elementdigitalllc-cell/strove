import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Repeat2, Heart, Eye, Share, Bookmark } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import {
  bumpPostInt,
  follow,
  unfollow,
  getFollowing,
  listComments,
  createComment,
  savePost,
  unsavePost,
  getSavedPostIds,
  likePost,
  unlikePost,
  getLikedPostIds,
  repostPost,
  unrepost,
  getRepostedOriginalIds,
} from '../lib/sdb';
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

// One Set per browser session — deduplicates view bumps so each post counts
// at most once per page-load regardless of how many times the card scrolls
// in and out of the viewport.
const viewedThisSession = new Set();

export default function PostCard({ post: initial }) {
  const { user } = useAuth();
  const [post, setPost] = useState(initial);
  const [following, setFollowing] = useState(false);
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [shareNote, setShareNote] = useState('');
  const articleRef = useRef(null);
  const viewedRef = useRef(false);

  useEffect(() => setPost(initial), [initial]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const [followsRes, savedRes, likedRes, repostedRes] = await Promise.all([
        getFollowing(user.id),
        getSavedPostIds(user.id),
        getLikedPostIds(user.id),
        getRepostedOriginalIds(user.id),
      ]);
      if (cancelled) return;
      setFollowing(followsRes.data.includes(post.user_id));
      setSaved((savedRes.data || []).includes(post.id));
      setLiked((likedRes.data || []).includes(post.id));
      setReposted((repostedRes.data || []).includes(post.id));
    })();
    return () => { cancelled = true; };
  }, [user, post.user_id, post.id]);

  useEffect(() => {
    if (!articleRef.current || !user || post.user_id === user.id) return;
    if (viewedThisSession.has(post.id)) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(async (e) => {
        if (e.isIntersecting && !viewedRef.current) {
          viewedRef.current = true;
          viewedThisSession.add(post.id);
          console.log('[PostCard.view] bumping views for', post.id);
          const { data, error } = await bumpPostInt(post.id, 'views');
          if (error) {
            console.error('[PostCard.view] bumpPostInt error:', error);
          } else {
            console.log('[PostCard.view] new views =', data?.views);
            if (data) setPost((p) => ({ ...p, views: data.views }));
          }
          obs.disconnect();
        }
      });
    }, { threshold: 0.5 });
    obs.observe(articleRef.current);
    return () => obs.disconnect();
  }, [post.id, post.user_id, user]);

  async function tapLike() {
    if (!user) return;
    if (liked) {
      const { error } = await unlikePost(user.id, post.id);
      if (error) return;
      setLiked(false);
      setPost((p) => ({ ...p, likes: Math.max((p.likes || 0) - 1, 0) }));
    } else {
      const { error } = await likePost(user.id, post.id);
      if (error) return;
      setLiked(true);
      setPost((p) => ({ ...p, likes: (p.likes || 0) + 1 }));
    }
  }

  async function tapRepost() {
    console.log('[PostCard.tapRepost] called', { user: user?.id, postId: post.id, reposted });
    if (!user) {
      console.warn('[PostCard.tapRepost] no user; aborting');
      return;
    }
    if (reposted) {
      const { error } = await unrepost(user.id, post.id);
      console.log('[PostCard.tapRepost] unrepost result error =', error);
      if (error) return;
      setReposted(false);
      setPost((p) => ({ ...p, reposts: Math.max((p.reposts || 0) - 1, 0) }));
    } else {
      const { data, error } = await repostPost({
        user_id: user.id,
        original_post_id: post.id,
        content: post.content || '',
      });
      console.log('[PostCard.tapRepost] repost result', { data, error });
      if (error) return;
      setReposted(true);
      setPost((p) => ({ ...p, reposts: (p.reposts || 0) + 1 }));
    }
  }

  async function tapSave() {
    if (!user) return;
    if (saved) {
      const { error } = await unsavePost(user.id, post.id);
      if (!error) setSaved(false);
    } else {
      const { error } = await savePost(user.id, post.id);
      if (!error) setSaved(true);
    }
  }

  async function openComments() {
    setCommentsOpen((v) => !v);
    if (!commentsOpen) {
      const { data } = await listComments(post.id);
      setComments(data);
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    const content = commentDraft.trim();
    if (!content || !user) return;
    setCommentSubmitting(true);
    const { data, error } = await createComment({
      post_id: post.id,
      user_id: user.id,
      content,
    });
    setCommentSubmitting(false);
    if (error) return;
    setCommentDraft('');
    setComments((c) => [...c, data]);
    setPost((p) => ({ ...p, comments: (p.comments || 0) + 1 }));
  }

  async function share() {
    const url = window.location.origin + '/profile/' + post.user_id;
    if (navigator.share) {
      try {
        await navigator.share({ text: post.content, url });
        return;
      } catch { /* fall through to clipboard */ }
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(post.content + '\n' + url);
        setShareNote('Link copied');
        setTimeout(() => setShareNote(''), 1500);
      } catch { /* noop */ }
    }
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
      {value !== undefined ? <span className="tabular-nums">{formatCount(value)}</span> : null}
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

        <div className="mt-2 pt-2.5 border-t border-border flex items-center justify-between max-w-[500px]">
          <Action icon={MessageCircle} value={post.comments || 0} active={commentsOpen} color="text-orange-400" onClick={openComments} ariaLabel="Comment" />
          <Action icon={Repeat2} value={post.reposts || 0} active={reposted} color="text-emerald-400" onClick={tapRepost} ariaLabel="Repost" />
          <Action icon={Heart} value={post.likes || 0} active={liked} color="text-orange" onClick={tapLike} ariaLabel="Like" />
          <Action icon={Eye} value={post.views || 0} ariaLabel="Views" />
          <Action icon={Bookmark} active={saved} color="text-orange-400" onClick={tapSave} ariaLabel="Save" />
          <Action icon={Share} onClick={share} ariaLabel="Share" />
        </div>

        {shareNote ? (
          <p className="mt-1.5 text-[11.5px] text-emerald-400">{shareNote}</p>
        ) : null}

        {commentsOpen ? (
          <div className="mt-3 pt-3 border-t border-border flex flex-col gap-3">
            {comments.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {comments.map((c) => (
                  <li key={c.id} className="flex gap-2.5 text-[14px]">
                    <Avatar name={c.profiles?.full_name || c.profiles?.username || '?'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[12.5px]">
                        <span className="font-bold text-fg">{c.profiles?.full_name || c.profiles?.username}</span>
                        <span className="text-muted">@{c.profiles?.username}</span>
                        <span className="text-muted">·</span>
                        <span className="text-muted">{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="mt-0.5 text-[14px] leading-snug whitespace-pre-wrap break-words text-fg">{c.content}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            {user ? (
              <form onSubmit={submitComment} className="flex gap-2">
                <input
                  type="text"
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Write a comment..."
                  maxLength={280}
                  className="flex-1 h-10 px-3 rounded bg-card border border-border text-fg text-[14px] placeholder:text-muted/70 outline-none focus:border-orange transition-colors"
                />
                <button
                  type="submit"
                  disabled={!commentDraft.trim() || commentSubmitting}
                  className="h-10 px-4 rounded bg-orange text-black text-[13px] font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition"
                >
                  {commentSubmitting ? '…' : 'Post'}
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
