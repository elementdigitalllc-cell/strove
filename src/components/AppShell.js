import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, Trophy, Plus, Lock, User, Bell, MessageSquare } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
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

  const key = location.pathname.startsWith('/profile') ? '/profile' : location.pathname;
  const title = TITLES[key] || 'Strove';
  const fallback = user?.__isFallback;

  return (
    <div className="relative mx-auto max-w-[520px] min-h-dvh bg-bg flex flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-border bg-bg/85 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <BrandLogo size={28} />
          <span className="text-[17px] font-bold tracking-tight">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <NavLink to="/notifications" aria-label="Notifications" className="h-8 w-8 grid place-items-center rounded text-muted hover:text-fg hover:bg-card transition-colors">
            <Bell size={18} strokeWidth={1.8} />
          </NavLink>
          <NavLink to="/messages" aria-label="Messages" className="h-8 w-8 grid place-items-center rounded text-muted hover:text-fg hover:bg-card transition-colors">
            <MessageSquare size={18} strokeWidth={1.8} />
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
