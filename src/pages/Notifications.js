import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Repeat2, UserPlus } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { getMyNotifications, markAllNotificationsRead } from '../lib/sdb';
import { Avatar } from '../components/ui/Avatar';
import { LoadingBlock } from '../components/ui/States';

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return s + 's ago';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  if (d < 7) return d + 'd ago';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function excerpt(text) {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= 50) return trimmed;
  return trimmed.slice(0, 50).trimEnd() + '…';
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
        const postSnippet = excerpt(n.post?.content);

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
              <span className="text-muted">liked your post:</span>{' '}
              {postSnippet ? <span className="text-fg">"{postSnippet}"</span> : null}
            </>
          );
        } else if (n.type === 'comment') {
          line = (
            <>
              <span className="font-semibold text-fg">{handle}</span>{' '}
              <span className="text-muted">commented on your post:</span>{' '}
              {postSnippet ? <span className="text-fg">"{postSnippet}"</span> : null}
            </>
          );
        } else if (n.type === 'repost') {
          line = (
            <>
              <span className="font-semibold text-fg">{handle}</span>{' '}
              <span className="text-muted">reposted your post:</span>{' '}
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
              {n.type === 'comment' && n.comment_content ? (
                <div className="mt-1 text-[13px] text-muted bg-card border border-border rounded px-2.5 py-1.5">
                  {n.comment_content}
                </div>
              ) : null}
            </div>
            <span className="text-[12px] text-muted shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
          </li>
        );
      })}
    </ul>
  );
}
