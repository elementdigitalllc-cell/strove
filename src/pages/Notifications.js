import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Repeat2, UserPlus } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { getMyNotifications, markNotificationRead } from '../lib/sdb';
import { timeAgo } from '../lib/time';
import { Avatar } from '../components/ui/Avatar';
import { LoadingBlock } from '../components/ui/States';

function excerpt(text, limit = 40) {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= limit) return trimmed;
  return trimmed.slice(0, limit).trimEnd() + '…';
}

const ICON = {
  follow: UserPlus,
  like: Heart,
  comment: MessageCircle,
  repost: Repeat2,
  comment_like: Heart,
  reply: MessageCircle,
};
const ICON_COLOR = {
  follow: 'text-orange',
  like: 'text-red-500',
  comment: 'text-orange',
  repost: 'text-emerald-400',
  comment_like: 'text-red-500',
  reply: 'text-orange',
};

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await getMyNotifications(user.id, 20);
      console.log('[Notifications] result', { count: data?.length, error });
      if (cancelled) return;
      setItems(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  async function handleNotificationClick(n) {
    console.log('[Notifications.handleNotificationClick]', { id: n.id, type: n.type });

    // Optimistically mark this row read in the UI.
    setItems((all) => all.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    if (!n.is_read) markNotificationRead(n.id);

    if (n.type === 'follow') {
      navigate('/profile/' + (n.actor?.id || ''));
      return;
    }
    if (n.post_id) {
      const qs = n.comment_id ? '?comment=' + n.comment_id : '';
      navigate('/post/' + n.post_id + qs);
    }
  }


  if (loading) return <LoadingBlock label="Loading notifications…" />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center min-h-[60dvh] gap-2 px-6">
        <div className="text-4xl">🔔</div>
        <h1 className="text-[18px] font-bold">No notifications yet</h1>
        <p className="text-sm text-muted max-w-[280px]">
          We'll let you know when someone follows, likes, comments, or reposts your stuff.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col -mx-4">
      {items.map((n) => {
        const Icon = ICON[n.type] || UserPlus;
        const iconColor = ICON_COLOR[n.type] || 'text-orange';
        const actor = n.actor || {};
        const handle = '@' + (actor.username || 'someone');
        const profileHref = '/profile/' + (actor.id || '');
        const postSnippet = excerpt(n.post_content, 40);
        const commentText = (n.comment_content || '').trim();

        let line;
        if (n.type === 'follow') {
          line = (
            <>
              <span className="font-semibold text-fg">{handle}</span>{' '}
              <span className="text-muted">followed you</span>
            </>
          );
        } else if (n.type === 'like') {
          line = (
            <>
              <span className="font-semibold text-fg">{handle}</span>{' '}
              <span className="text-muted">liked your post</span>{' '}
              {postSnippet ? <span className="text-fg">"{postSnippet}"</span> : null}
            </>
          );
        } else if (n.type === 'comment') {
          line = (
            <>
              <span className="font-semibold text-fg">{handle}</span>{' '}
              <span className="text-muted">commented:</span>{' '}
              {commentText ? <span className="text-fg">"{commentText}"</span> : null}{' '}
              <span className="text-muted">on your post</span>{' '}
              {postSnippet ? <span className="text-fg">"{postSnippet}"</span> : null}
            </>
          );
        } else if (n.type === 'repost') {
          line = (
            <>
              <span className="font-semibold text-fg">{handle}</span>{' '}
              <span className="text-muted">reposted your post</span>{' '}
              {postSnippet ? <span className="text-fg">"{postSnippet}"</span> : null}
            </>
          );
        } else if (n.type === 'comment_like') {
          const likedSnippet = excerpt(n.liked_comment_content, 40);
          line = (
            <>
              <span className="font-semibold text-fg">{handle}</span>{' '}
              <span className="text-muted">liked your comment:</span>{' '}
              {likedSnippet ? <span className="text-fg">"{likedSnippet}"</span> : null}
            </>
          );
        } else if (n.type === 'reply') {
          const replyText = (n.reply_content || '').trim();
          line = (
            <>
              <span className="font-semibold text-fg">{handle}</span>{' '}
              <span className="text-muted">replied to your comment:</span>{' '}
              {replyText ? <span className="text-fg">"{replyText}"</span> : null}
            </>
          );
        } else {
          line = (
            <>
              <span className="font-semibold text-fg">{handle}</span>{' '}
              <span className="text-muted">interacted with you</span>
            </>
          );
        }

        return (
          <li
            key={n.id}
            role="button"
            tabIndex={0}
            onClick={() => handleNotificationClick(n)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleNotificationClick(n);
              }
            }}
            className={
              'flex items-start gap-3 px-4 py-3 border-b border-border cursor-pointer select-none hover:bg-card/60 transition-colors ' +
              (n.is_read ? '' : 'bg-orange/5')
            }
          >
            <Icon size={18} className={iconColor + ' shrink-0 mt-0.5'} strokeWidth={2} />
            <Link to={profileHref} onClick={(e) => e.stopPropagation()} className="shrink-0">
              <Avatar name={actor.full_name || actor.username || '?'} size="sm" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] leading-snug">{line}</div>
            </div>
            <span className="text-[12px] text-muted shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
          </li>
        );
      })}
    </ul>
  );
}
