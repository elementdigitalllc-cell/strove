import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import {
  searchProfiles,
  follow,
  unfollow,
  getFollowing,
  createNotification,
} from '../lib/sdb';
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from '../lib/recentSearches';
import { Avatar } from '../components/ui/Avatar';
import { StreakPill } from '../components/ui/Pill';
import { BadgeStrip } from '../components/Badges';
import { cn } from '../lib/cn';

export default function Search() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [followingSet, setFollowingSet] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recents, setRecents] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    setRecents(getRecentSearches(user.id));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await getFollowing(user.id);
      setFollowingSet(new Set(data || []));
    })();
  }, [user?.id]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await searchProfiles(q, 20);
      if (cancelled) return;
      setResults(data.filter((p) => p.id !== user?.id));
      setSearched(true);
      setLoading(false);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, user?.id]);

  async function toggleFollow(targetId) {
    if (!user || targetId === user.id) return;
    const isFollowing = followingSet.has(targetId);
    if (isFollowing) {
      const { error } = await unfollow(user.id, targetId);
      if (error) return;
      setFollowingSet((prev) => {
        const n = new Set(prev);
        n.delete(targetId);
        return n;
      });
    } else {
      const { error } = await follow(user.id, targetId);
      if (error) return;
      setFollowingSet((prev) => {
        const n = new Set(prev);
        n.add(targetId);
        return n;
      });
      createNotification({ user_id: targetId, actor_id: user.id, type: 'follow' });
    }
  }

  return (
    <div className="-mx-4">
      <div className="sticky top-[57px] z-10 bg-bg/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-2">
        <SearchIcon size={16} className="text-muted shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people by name or @username"
          className="flex-1 h-9 bg-transparent text-fg text-[14.5px] placeholder:text-muted/70 outline-none"
        />
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Close"
          className="h-8 w-8 grid place-items-center rounded text-muted hover:text-fg hover:bg-card transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {loading ? (
        <div className="px-4 py-6 text-center text-sm text-muted">Searching…</div>
      ) : results.length > 0 ? (
        <ul className="flex flex-col">
          {results.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-card/60 transition-colors cursor-pointer"
              onClick={() => {
                if (user?.id) setRecents(addRecentSearch(user.id, p));
                navigate('/profile/' + p.id);
              }}
              role="button"
            >
              <Avatar name={p.full_name || p.username || '?'} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-fg text-[14.5px]">{p.full_name || p.username}</span>
                  <StreakPill count={p.streak_count || 0} />
                  <BadgeStrip badges={p.badges} />
                </div>
                <div className="text-[13px] text-muted font-medium">@{p.username}</div>
              </div>
              {user && p.id !== user.id ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFollow(p.id);
                  }}
                  className={cn(
                    'shrink-0 px-3.5 py-1.5 text-[12px] font-bold rounded transition-colors',
                    followingSet.has(p.id)
                      ? 'bg-transparent text-muted border border-border hover:text-rose-300 hover:border-rose-500/40'
                      : 'bg-fg text-bg hover:brightness-95'
                  )}
                >
                  {followingSet.has(p.id) ? 'Following' : 'Follow'}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : searched ? (
        <div className="flex flex-col items-center justify-center text-center min-h-[40dvh] gap-2 px-6">
          <div className="text-4xl">🔍</div>
          <h2 className="text-[16px] font-bold">No users found</h2>
          <p className="text-sm text-muted">Try a different name or @username.</p>
        </div>
      ) : recents.length > 0 ? (
        <div>
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-muted">
              Recent Searches
            </h2>
            <button
              type="button"
              onClick={() => {
                if (!user?.id) return;
                clearRecentSearches(user.id);
                setRecents([]);
              }}
              className="text-[12px] font-semibold text-orange hover:underline"
            >
              Clear all
            </button>
          </div>
          <ul className="flex flex-col">
            {recents.map((p) => (
              <li
                key={p.id}
                onClick={() => {
                  if (user?.id) setRecents(addRecentSearch(user.id, p));
                  navigate('/profile/' + p.id);
                }}
                role="button"
                className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-card/60 transition-colors cursor-pointer"
              >
                <Avatar name={p.full_name || p.username || '?'} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-fg text-[14.5px] truncate">
                    {p.full_name || p.username}
                  </div>
                  <div className="text-[13px] text-muted font-medium truncate">@{p.username}</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!user?.id) return;
                    setRecents(removeRecentSearch(user.id, p.id));
                  }}
                  aria-label="Remove from recent searches"
                  className="h-8 w-8 grid place-items-center rounded text-muted hover:text-fg hover:bg-card transition-colors"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-sm text-muted">
          Start typing to find people on Strove.
        </div>
      )}
    </div>
  );
}
