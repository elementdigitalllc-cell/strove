import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Trophy, Plus, Lock, User, Bell, MessageSquare, Search } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { getUnreadNotificationCount, getUnreadMessageCount } from '../lib/sdb';
import { supabase } from '../supabaseClient';
import BrandLogo from './BrandLogo';
import { cn } from '../lib/cn';

const tabs = [
  { to: '/home', label: 'Home', Icon: Home },
  { to: '/compete', label: 'Compete', Icon: Trophy },
  { to: '/create', label: 'Post', Icon: Plus, accent: true },
  { to: '/journal', label: 'Journal', Icon: Lock },
  { to: '/profile', label: 'Profile', Icon: User },
];

const TITLES = {
  '/home': 'Strove',
  '/create': 'New Post',
  '/compete': 'Compete',
  '/journal': 'Journal',
  '/profile': 'Profile',
};

export default function AppShell() {
  const { user, profileError } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadDmCount, setUnreadDmCount] = useState(0);

  function onLogoClick(e) {
    e.preventDefault();
    if (location.pathname === '/home') {
      window.dispatchEvent(new CustomEvent('strove:refresh-feed'));
    } else {
      navigate('/home');
    }
  }

  const key = location.pathname.startsWith('/profile') ? '/profile' : location.pathname;
  const title = TITLES[key] || 'Strove';
  const fallback = user?.__isFallback;

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    async function refresh() {
      const { count } = await getUnreadNotificationCount(user.id);
      console.log('[AppShell.notifications] unread count =', count);
      if (!cancelled) setUnreadCount(count);
    }
    refresh();

    // Realtime: any INSERT on notifications for this user bumps the badge
    // immediately. UPDATEs (e.g. mark-all-read) trigger a refetch so the
    // count drops back to zero when the user opens the panel.
    const channel = supabase
      .channel('notifications-' + user.id)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + user.id },
        (payload) => {
          console.log('[AppShell.notifications] realtime INSERT', payload.new);
          if (!cancelled) setUnreadCount((c) => c + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + user.id },
        () => {
          if (!cancelled) refresh();
        }
      )
      .subscribe((status) => {
        console.log('[AppShell.notifications] channel status =', status);
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id, location.pathname]);

  // Unread DM badge: realtime on messages + explicit refresh event from
  // MessageThread after mark-as-read finishes.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    async function refresh(reason) {
      const { count } = await getUnreadMessageCount(user.id);
      console.log('[AppShell.dms] refresh (' + reason + ') -> count =', count);
      if (!cancelled) setUnreadDmCount(count);
    }
    refresh('mount');

    // Only INSERT — UPDATE events (mark-as-read) would re-trigger a refetch
    // that races against our optimistic-zero state and brings the badge back.
    const channel = supabase
      .channel('dm-badge-' + user.id)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('[AppShell.dms] realtime INSERT', payload.new?.id);
          if (cancelled) return;
          // Only refresh if this insert is from someone else (others' messages
          // are the only ones that can increase your unread count).
          if (payload.new?.sender_id !== user.id) refresh('insert');
        }
      )
      .subscribe((status) => console.log('[AppShell.dms] channel status =', status));

    function onCustom(ev) {
      const delta = Number(ev?.detail?.delta) || 0;
      if (delta > 0) {
        setUnreadDmCount((prev) => Math.max(0, prev - delta));
      }
    }
    window.addEventListener('strove:refresh-dm-badge', onCustom);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      window.removeEventListener('strove:refresh-dm-badge', onCustom);
    };
  }, [user?.id]);

  return (
    <div className="relative mx-auto max-w-[520px] min-h-dvh bg-bg flex flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-border bg-bg/85 backdrop-blur">
        <a
          href="/home"
          onClick={onLogoClick}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
          aria-label="Home"
        >
          <BrandLogo size={28} />
          <span className="text-[17px] font-bold tracking-tight">{title}</span>
        </a>
        <div className="flex items-center gap-1.5">
          <NavLink to="/search" aria-label="Search" className="h-8 w-8 grid place-items-center rounded text-muted hover:text-fg hover:bg-card transition-colors">
            <Search size={18} strokeWidth={1.8} />
          </NavLink>
          <NavLink to="/notifications" aria-label="Notifications" className="relative h-8 w-8 grid place-items-center rounded text-muted hover:text-fg hover:bg-card transition-colors">
            <Bell size={18} strokeWidth={1.8} />
            {unreadCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-orange text-black text-[10px] font-bold grid place-items-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </NavLink>
          <NavLink to="/messages" aria-label="Messages" className="relative h-8 w-8 grid place-items-center rounded text-muted hover:text-fg hover:bg-card transition-colors">
            <MessageSquare size={18} strokeWidth={1.8} />
            {unreadDmCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-orange text-black text-[10px] font-bold grid place-items-center leading-none">
                {unreadDmCount > 9 ? '9+' : unreadDmCount}
              </span>
            ) : null}
          </NavLink>
          <NavLink to="/profile" className="h-8 w-8 rounded-full overflow-hidden grid place-items-center text-orange-400 font-bold text-sm bg-card border border-border" aria-label="Profile">
            <span>{(user?.full_name || user?.username || '?')[0].toUpperCase()}</span>
          </NavLink>
        </div>
      </header>

      <main className="flex-1 px-4 pt-4 pb-24">
        {fallback ? (
          <div className="mb-3 rounded border border-amber-500/40 bg-amber-500/10 text-amber-200 text-[12.5px] px-3.5 py-2.5 leading-relaxed">
            <strong className="font-bold">Profile not loaded.</strong>{' '}
            {profileError?.message || 'Using a temporary profile. Some features may be limited.'}
          </div>
        ) : null}
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 mx-auto max-w-[520px] z-40 grid grid-cols-5 gap-1 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 border-t border-border bg-bg/95 backdrop-blur">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 py-1.5 rounded text-[11px] font-medium transition-colors',
                isActive ? 'text-orange' : 'text-muted hover:text-fg'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'grid place-items-center',
                    t.accent
                      ? cn('h-9 w-9 rounded bg-orange text-black', isActive && 'scale-105')
                      : cn('h-8 w-8 rounded', isActive && 'bg-orange/15')
                  )}
                >
                  <t.Icon size={20} strokeWidth={1.8} />
                </span>
                <span>{t.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
