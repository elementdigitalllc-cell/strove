import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Repeat2, Heart, Eye, Share, Bookmark } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../supabaseClient';
import {
  listComments,
  createComment,
  savePost,
  unsavePost,
  getSavedPostIds,
  likePost,
  unlikePost,
  repostPost,
  unrepost,
  createNotification,
} from '../lib/sdb';
import { Avatar } from './ui/Avatar';
import { StreakPill } from './ui/Pill';
import { cn } from '../lib/cn';
import { timeAgo } from '../lib/time';


function formatCount(n) {
  const v = n || 0;
  if (v < 1000) return String(v);
  if (v < 1_000_000) return (v / 1000).toFixed(v < 10_000 ? 1 : 0).replace(/\.0$/, '') + 'K';
  return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
}


export default function PostCard({ post: initial, isFollowing, onToggleFollow }) {
  const { user } = useAuth();
  const [post, setPost] = useState(initial);
  const [liked, setLiked] = useState(!!initial.currentUserLiked);
  const [reposted, setReposted] = useState(!!initial.currentUserReposted);
  const [saved, setSaved] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [shareNote, setShareNote] = useState('');
  const articleRef = useRef(null);

  useEffect(() => {
    setPost(initial);
    setLiked(!!initial.currentUserLiked);
    setReposted(!!initial.currentUserReposted);
  }, [initial]);

  // Views: bump exactly once on mount. Requires RLS to allow non-owner
  // UPDATE on posts.views (see supabase-views-policy.sql).
  useEffect(() => {
    supabase
      .from('posts')
      .update({ views: (initial.views || 0) + 1 })
      .eq('id', initial.id)
      .then(({ error }) => {
        if (error) console.error('[PostCard.view] update error:', error);
        else setPost((p) => ({ ...p, views: (p.views || 0) + 1 }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const { data: savedIds } = await getSavedPostIds(user.id);
      if (cancelled) return;
      setSaved((savedIds || []).includes(post.id));
    })();
    return () => { cancelled = true; };
  }, [user, post.id]);

  async function tapLike() {
    console.log('[PostCard.tapLike] clicked', { userId: user?.id, postId: post.id, liked });
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
      createNotification({
        user_id: post.user_id,
        actor_id: user.id,
        type: 'like',
        post_id: post.id,
      });
    }
  }

  async function tapRepost() {
    console.log('[PostCard.tapRepost] clicked', { userId: user?.id, postId: post.id, reposted });
    if (!user) return;
    if (reposted) {
      const { error } = await unrepost(user.id, post.id);
      if (error) return;
      setReposted(false);
      setPost((p) => ({ ...p, reposts: Math.max((p.reposts || 0) - 1, 0) }));
    } else {
      const { error } = await repostPost({ user_id: user.id, post_id: post.id });
      if (error) return;
      setReposted(true);
      setPost((p) => ({ ...p, reposts: (p.reposts || 0) + 1 }));
      createNotification({
        user_id: post.user_id,
        actor_id: user.id,
        type: 'repost',
        post_id: post.id,
      });
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
    console.log('[PostCard.submitComment] inserting', { postId: post.id });
    const { data, error } = await createComment({
      post_id: post.id,
      user_id: user.id,
      content,
    });
    setCommentSubmitting(false);
    if (error) {
      console.error('[PostCard.submitComment] error:', error);
      return;
    }
    setCommentDraft('');
    setComments((c) => [...c, data]);
    setPost((p) => ({ ...p, comments: (p.comments || 0) + 1 }));
    createNotification({
      user_id: post.user_id,
      actor_id: user.id,
      type: 'comment',
      post_id: post.id,
    });
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

  function toggleFollow() {
    if (onToggleFollow) onToggleFollow(post.user_id);
  }

  const author = post.profiles || {};
  const isOwn = post.user_id === user?.id;
  const displayName = author.full_name || author.username || 'Unknown';

  const Action = ({ icon: Icon, value, active, color, onClick, ariaLabel }) => (
    <button
      type="button"
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
    <article ref={articleRef} className="flex flex-col px-4 py-4 border-b border-border">
      {post.repost_by ? (
        <div className="flex items-center gap-1.5 text-[12px] text-muted font-medium mb-1.5 pl-12">
          <Repeat2 size={13} strokeWidth={2} className="text-emerald-400" />
          <span>
            Reposted by{' '}
            <Link to={'/profile/' + post.repost_by.id} className="hover:underline text-fg font-semibold">
              @{post.repost_by.username}
            </Link>
          </span>
        </div>
      ) : null}
      <div className="flex gap-3">
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
                isFollowing
                  ? 'bg-transparent text-muted border border-border hover:text-rose-300 hover:border-rose-500/40'
                  : 'bg-fg text-bg hover:brightness-95'
              )}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          ) : null}
        </header>

        {post.content ? (
          <p className="my-1.5 text-[15px] leading-[1.45] whitespace-pre-wrap break-words text-fg font-normal">{post.content}</p>
        ) : null}

        <div className="mt-2 pt-2.5 border-t border-border flex items-center justify-between max-w-[500px]">
          <Action icon={MessageCircle} value={post.comments || 0} active={commentsOpen} color="text-orange-400" onClick={openComments} ariaLabel="Comment" />
          <Action icon={Repeat2} value={post.reposts || 0} active={reposted} color="text-emerald-400" onClick={tapRepost} ariaLabel="Repost" />
          <Action icon={Heart} value={post.likes || 0} active={liked} color="text-red-500" onClick={tapLike} ariaLabel="Like" />
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
      </div>
    </article>
  );
}
