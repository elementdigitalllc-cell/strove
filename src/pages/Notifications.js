import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Repeat2, UserPlus } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { getMyNotifications, markAllNotificationsRead } from '../lib/sdb';
import { Avatar } from '../components/ui/Avatar';
import { LoadingBlock } from '../components/ui/States';

function timeAgo(ts) {
  // Supabase "timestamp without time zone" values come back without a Z, so
  // new Date() interprets them in the local timezone — producing a "future"
  // timestamp and negative deltas. Force UTC parsing when no offset is present.
  let parsed;
  if (typeof ts === 'string' && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(ts)) {
    parsed = new Date(ts + 'Z');
  } else {
    parsed = new Date(ts);
  }
  const seconds = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 1000));
  if (seconds < 60) return seconds + 's ago';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  return Math.floor(seconds / 86400) + 'd ago';
}

function excerpt(text, limit = 40) {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= limit) return trimmed;
  return trimmed.slice(0, limit).trimEnd() + '…';
}

const ICON = { follow: UserPlus, like: Heart, comment: MessageCircle, repost: Repeat2 };
const ICON_COLOR = {
  follow: 'text-orange',
  like: 'text-red-500',
  comment: 'text-orange',
  repost: 'text-emerald-400',
};

export default function Notifications() {
  const { user } = useAuth();
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
      await markAllNotificationsRead(user.id);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

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
            className={
              'flex items-start gap-3 px-4 py-3 border-b border-border ' +
              (n.is_read ? '' : 'bg-orange/5')
            }
          >
            <Icon size={18} className={iconColor + ' shrink-0 mt-0.5'} strokeWidth={2} />
            <Link to={profileHref} className="shrink-0">
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
