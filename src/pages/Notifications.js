import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Repeat2, UserPlus } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { getMyNotifications, markAllNotificationsRead } from '../lib/sdb';
import { Avatar } from '../components/ui/Avatar';
import { LoadingBlock } from '../components/ui/States';

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

const ICON = { follow: UserPlus, like: Heart, comment: MessageCircle, repost: Repeat2 };
const VERB = {
  follow: 'started following you',
  like: 'liked your post',
  comment: 'commented on your post',
  repost: 'reposted your post',
};

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      console.log('[Notifications] fetching for user', user.id);
      const { data, error } = await getMyNotifications(user.id);
      console.log('[Notifications] result', { count: data?.length, error });
      if (cancelled) return;
      setItems(data);
      setLoading(false);
      const { error: markErr } = await markAllNotificationsRead(user.id);
      if (markErr) console.error('[Notifications] markAllRead error:', markErr);
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
          We'll let you know when someone follows, likes, or comments on your stuff.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col -mx-4">
      {items.map((n) => {
        const Icon = ICON[n.type] || UserPlus;
        const verb = VERB[n.type] || 'interacted with you';
        const actor = n.actor || {};
        const profileHref = '/profile/' + (actor.id || '');
        return (
          <li
            key={n.id}
            className={
              'flex items-center gap-3 px-4 py-3 border-b border-border ' +
              (n.is_read ? '' : 'bg-orange/5')
            }
          >
            <Icon size={18} className="text-orange shrink-0" strokeWidth={2} />
            <Link to={profileHref} className="shrink-0">
              <Avatar name={actor.full_name || actor.username || '?'} size="sm" />
            </Link>
            <div className="flex-1 min-w-0 text-[14px]">
              <Link to={profileHref} className="font-bold text-fg hover:underline">
                {actor.full_name || actor.username || 'Someone'}
              </Link>{' '}
              <span className="text-muted">{verb}</span>
            </div>
            <span className="text-[12px] text-muted shrink-0">{timeAgo(n.created_at)}</span>
          </li>
        );
      })}
    </ul>
  );
}
