import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Repeat2, Heart, Eye, Share, Bookmark, Trash2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../supabaseClient';
import {
  listComments,
  createComment,
  deleteComment,
  savePost,
  unsavePost,
  getSavedPostIds,
  likePost,
  unlikePost,
  repostPost,
  unrepost,
  createNotification,
  likeComment,
  unlikeComment,
  getLikedCommentIdsByPost,
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


export default function PostCard({ post: initial, isFollowing, onToggleFollow, forceOpenComments = false, highlightCommentId = null }) {
  const { user } = useAuth();
  const [post, setPost] = useState(initial);
  const [liked, setLiked] = useState(!!initial.currentUserLiked);
  const [reposted, setReposted] = useState(!!initial.currentUserReposted);
  const [saved, setSaved] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(!!forceOpenComments);
  const [comments, setComments] = useState([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [likedCommentIds, setLikedCommentIds] = useState(() => new Set());
  const [replyTo, setReplyTo] = useState(null); // { id, username } | null
  const [replyDraft, setReplyDraft] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
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

  const loadCommentsData = useCallback(async () => {
    const [{ data: list }, { data: likedIds }] = await Promise.all([
      listComments(post.id),
      user ? getLikedCommentIdsByPost(user.id, post.id) : Promise.resolve({ data: [] }),
    ]);
    setComments(list);
    setLikedCommentIds(new Set(likedIds || []));
  }, [post.id, user]);

  useEffect(() => {
    if (forceOpenComments) {
      setCommentsOpen(true);
      loadCommentsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceOpenComments, post.id]);

  async function openComments() {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next) await loadCommentsData();
  }

  async function submitComment(e) {
    e.preventDefault();
    const content = commentDraft.trim();
    if (!content || !user) return;
    if (commentSubmitting) return; // guard against double-fire (enter + click)
    setCommentSubmitting(true);
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
    if (post.user_id && post.user_id !== user.id) {
      createNotification({
        user_id: post.user_id,
        actor_id: user.id,
        type: 'comment',
        post_id: post.id,
        comment_id: data?.id || null,
      });
    }
  }

  async function submitReply(e) {
    e.preventDefault();
    const content = replyDraft.trim();
    if (!content || !user || !replyTo) return;
    if (replySubmitting) return;
    setReplySubmitting(true);
    const { data, error } = await createComment({
      post_id: post.id,
      user_id: user.id,
      content,
      parent_comment_id: replyTo.parent_id || replyTo.id,
    });
    setReplySubmitting(false);
    if (error) {
      console.error('[PostCard.submitReply] error:', error);
      return;
    }
    const replyTarget = replyTo;
    setReplyDraft('');
    setReplyTo(null);
    setComments((c) => [...c, data]);
    setPost((p) => ({ ...p, comments: (p.comments || 0) + 1 }));
    if (replyTarget.user_id && replyTarget.user_id !== user.id) {
      createNotification({
        user_id: replyTarget.user_id,
        actor_id: user.id,
        type: 'reply',
        post_id: post.id,
        comment_id: data?.id || null,
      });
    }
  }

  function startReply(c) {
    // Flatten thread: every reply lives one level below the root comment, so
    // we use the root's id as the parent. If the clicked comment is already a
    // reply, the root is c.parent_comment_id; otherwise it's c.id.
    const parent_id = c.parent_comment_id || c.id;
    setReplyTo({
      id: c.id,
      parent_id,
      username: c.profiles?.username || '',
      user_id: c.user_id,
    });
    setReplyDraft('@' + (c.profiles?.username || '') + ' ');
  }

  async function toggleCommentLike(c) {
    if (!user) return;
    const isLiked = likedCommentIds.has(c.id);
    if (isLiked) {
      const { error } = await unlikeComment(user.id, c.id);
      if (error) return;
      setLikedCommentIds((s) => {
        const n = new Set(s);
        n.delete(c.id);
        return n;
      });
      setComments((all) =>
        all.map((x) => (x.id === c.id ? { ...x, likes: Math.max((x.likes || 0) - 1, 0) } : x))
      );
    } else {
      const { error } = await likeComment(user.id, c.id);
      if (error) return;
      setLikedCommentIds((s) => {
        const n = new Set(s);
        n.add(c.id);
        return n;
      });
      setComments((all) =>
        all.map((x) => (x.id === c.id ? { ...x, likes: (x.likes || 0) + 1 } : x))
      );
      if (c.user_id && c.user_id !== user.id) {
        createNotification({
          user_id: c.user_id,
          actor_id: user.id,
          type: 'comment_like',
          post_id: post.id,
          comment_id: c.id,
        });
      }
    }
  }

  async function removeComment(c) {
    if (!user || c.user_id !== user.id) return;
    const { error } = await deleteComment(c.id);
    if (error) return;
    setComments((all) => all.filter((x) => x.id !== c.id && x.parent_comment_id !== c.id));
    setPost((p) => ({ ...p, comments: Math.max((p.comments || 0) - 1, 0) }));
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
          <CommentsBlock
            comments={comments}
            currentUserId={user?.id}
            likedCommentIds={likedCommentIds}
            highlightCommentId={highlightCommentId}
            onToggleLike={toggleCommentLike}
            onStartReply={startReply}
            onDelete={removeComment}
            replyTo={replyTo}
            replyDraft={replyDraft}
            setReplyDraft={setReplyDraft}
            onSubmitReply={submitReply}
            onCancelReply={() => { setReplyTo(null); setReplyDraft(''); }}
            replySubmitting={replySubmitting}
            commentDraft={commentDraft}
            setCommentDraft={setCommentDraft}
            onSubmitComment={submitComment}
            commentSubmitting={commentSubmitting}
            canPost={!!user}
          />
        ) : null}
      </div>
      </div>
    </article>
  );
}

function CommentsBlock({
  comments,
  currentUserId,
  likedCommentIds,
  highlightCommentId,
  onToggleLike,
  onStartReply,
  onDelete,
  replyTo,
  replyDraft,
  setReplyDraft,
  onSubmitReply,
  onCancelReply,
  replySubmitting,
  commentDraft,
  setCommentDraft,
  onSubmitComment,
  commentSubmitting,
  canPost,
}) {
  const roots = comments.filter((c) => !c.parent_comment_id);
  const childrenByParent = comments.reduce((acc, c) => {
    if (!c.parent_comment_id) return acc;
    if (!acc[c.parent_comment_id]) acc[c.parent_comment_id] = [];
    acc[c.parent_comment_id].push(c);
    return acc;
  }, {});

  const replyForm = (
    <form onSubmit={onSubmitReply} className="flex gap-2 mt-2 pl-9">
      <input
        type="text"
        autoFocus
        value={replyDraft}
        onChange={(e) => setReplyDraft(e.target.value)}
        placeholder={'Reply to @' + (replyTo?.username || '')}
        maxLength={280}
        className="flex-1 h-9 px-3 rounded bg-card border border-border text-fg text-[13.5px] placeholder:text-muted/70 outline-none focus:border-orange transition-colors"
      />
      <button
        type="button"
        onClick={onCancelReply}
        className="h-9 px-3 rounded text-muted hover:text-fg text-[12.5px]"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={!replyDraft.trim() || replySubmitting}
        className="h-9 px-3.5 rounded bg-orange text-black text-[12.5px] font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition"
      >
        {replySubmitting ? '…' : 'Reply'}
      </button>
    </form>
  );

  return (
    <div className="mt-3 pt-3 border-t border-border flex flex-col gap-3">
      {roots.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {roots.map((root) => (
            <li key={root.id} className="flex flex-col gap-2">
              <CommentRow
                comment={root}
                currentUserId={currentUserId}
                liked={likedCommentIds.has(root.id)}
                highlighted={highlightCommentId === root.id}
                onToggleLike={onToggleLike}
                onStartReply={onStartReply}
                onDelete={onDelete}
              />
              {replyTo?.id === root.id ? replyForm : null}
              {(childrenByParent[root.id] || []).length > 0 ? (
                <ul className="pl-9 flex flex-col gap-2 border-l border-border ml-3">
                  {(childrenByParent[root.id] || []).map((child) => (
                    <li key={child.id} className="flex flex-col gap-2">
                      <CommentRow
                        comment={child}
                        currentUserId={currentUserId}
                        liked={likedCommentIds.has(child.id)}
                        highlighted={highlightCommentId === child.id}
                        onToggleLike={onToggleLike}
                        onStartReply={onStartReply}
                        onDelete={onDelete}
                      />
                      {replyTo?.id === child.id ? replyForm : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {canPost ? (
        <form onSubmit={onSubmitComment} className="flex gap-2">
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
  );
}

function CommentRow({ comment: c, currentUserId, liked, highlighted, onToggleLike, onStartReply, onDelete }) {
  const isOwn = c.user_id === currentUserId;
  const ref = useRef(null);

  useEffect(() => {
    if (!highlighted) return;
    const el = ref.current || document.getElementById('comment-' + c.id);
    if (!el) return;
    const scrollTimer = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('comment-highlight');
    }, 50);
    function onEnd() {
      el.classList.remove('comment-highlight');
    }
    el.addEventListener('animationend', onEnd);
    return () => {
      clearTimeout(scrollTimer);
      el.removeEventListener('animationend', onEnd);
      el.classList.remove('comment-highlight');
    };
  }, [highlighted, c.id]);

  return (
    <div
      ref={ref}
      id={'comment-' + c.id}
      className="flex gap-2.5 text-[14px]"
    >
      <Avatar name={c.profiles?.full_name || c.profiles?.username || '?'} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[12.5px]">
          <span className="font-bold text-fg">{c.profiles?.full_name || c.profiles?.username}</span>
          <span className="text-muted">@{c.profiles?.username}</span>
          <span className="text-muted">·</span>
          <span className="text-muted">{timeAgo(c.created_at)}</span>
        </div>
        <p className="mt-0.5 text-[14px] leading-snug whitespace-pre-wrap break-words text-fg">{c.content}</p>
        <div className="mt-1.5 flex items-center gap-3 text-[12px] text-muted">
          <button
            type="button"
            onClick={() => onToggleLike(c)}
            className={cn(
              'inline-flex items-center gap-1 hover:text-fg transition-colors',
              liked && 'text-red-500'
            )}
            aria-label="Like comment"
          >
            <Heart size={13} strokeWidth={1.8} fill={liked ? 'currentColor' : 'none'} />
            <span className="tabular-nums">{c.likes || 0}</span>
          </button>
          <button
            type="button"
            onClick={() => onStartReply(c)}
            className="hover:text-fg transition-colors"
          >
            Reply
          </button>
          {isOwn ? (
            <button
              type="button"
              onClick={() => onDelete(c)}
              className="ml-auto hover:text-rose-400 transition-colors"
              aria-label="Delete comment"
            >
              <Trash2 size={13} strokeWidth={1.8} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
