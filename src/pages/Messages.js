import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X, Trash2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import {
  listMyConversations,
  deleteConversation,
  getOrCreateConversation,
  searchProfiles,
} from '../lib/sdb';
import { timeAgo } from '../lib/time';
import { Avatar } from '../components/ui/Avatar';
import { LoadingBlock } from '../components/ui/States';

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null); // conversation id
  const longPressTimer = useRef(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await listMyConversations(user.id);
    setItems(data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const q = query.trim();
    if (!q || !user?.id) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data } = await searchProfiles(q, 10);
      if (cancelled) return;
      setSearchResults(data.filter((p) => p.id !== user.id));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, user?.id]);

  async function openConversationWith(otherId) {
    if (!user?.id) return;
    const { data, error } = await getOrCreateConversation(user.id, otherId);
    if (error || !data) return;
    navigate('/messages/' + data.id);
  }

  function startLongPress(convoId) {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => setPendingDelete(convoId), 550);
  }
  function cancelLongPress() {
    clearTimeout(longPressTimer.current);
  }

  async function confirmDelete(convoId) {
    setPendingDelete(null);
    const { error } = await deleteConversation(convoId);
    if (!error) setItems((all) => all.filter((c) => c.id !== convoId));
  }

  return (
    <div className="-mx-4">
      <div className="sticky top-[57px] z-10 bg-bg/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-2">
        <SearchIcon size={16} className="text-muted shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a person to message"
          className="flex-1 h-9 bg-transparent text-fg text-[14px] placeholder:text-muted/70 outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="h-7 w-7 grid place-items-center rounded text-muted hover:text-fg hover:bg-card"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {query.trim() ? (
        searchResults.length > 0 ? (
          <ul>
            {searchResults.map((p) => (
              <li
                key={p.id}
                onClick={() => openConversationWith(p.id)}
                role="button"
                className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-card/60 cursor-pointer transition-colors"
              >
                <Avatar name={p.full_name || p.username || '?'} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-fg text-[14.5px]">{p.full_name || p.username}</div>
                  <div className="text-[13px] text-muted">@{p.username}</div>
                </div>
                <span className="text-[12px] text-orange font-semibold">Message</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-6 text-center text-sm text-muted">No people match that.</div>
        )
      ) : loading ? (
        <LoadingBlock label="Loading messages…" />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center min-h-[50dvh] gap-2 px-6">
          <div className="text-4xl">💬</div>
          <h2 className="text-[18px] font-bold">No conversations yet</h2>
          <p className="text-sm text-muted max-w-[280px]">
            Search for someone above to start a new message thread.
          </p>
        </div>
      ) : (
        <ul>
          {items.map((c) => {
            const other = c.other || {};
            const last = c.lastMessage;
            const lastFromMe = last && last.sender_id === user?.id;
            const lastText = last
              ? (lastFromMe ? 'You: ' : '') + last.content
              : 'No messages yet';
            const unread = last && !lastFromMe && !last.is_read;
            return (
              <li
                key={c.id}
                onClick={() => navigate('/messages/' + c.id)}
                onMouseDown={() => startLongPress(c.id)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => startLongPress(c.id)}
                onTouchEnd={cancelLongPress}
                role="button"
                className={
                  'relative flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-card/60 cursor-pointer select-none transition-colors ' +
                  (unread ? 'bg-orange/5' : '')
                }
              >
                <Avatar name={other.full_name || other.username || '?'} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-fg text-[14.5px] truncate">
                      {other.full_name || other.username || 'Unknown'}
                    </span>
                    <span className="text-muted text-[12.5px] truncate">@{other.username}</span>
                  </div>
                  <div className={'mt-0.5 text-[13px] truncate ' + (unread ? 'text-fg font-medium' : 'text-muted')}>
                    {lastText}
                  </div>
                </div>
                <span className="text-[11.5px] text-muted shrink-0 self-start mt-1">
                  {last ? timeAgo(last.created_at) : ''}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm grid place-items-center px-5"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="w-full max-w-[360px] bg-card border border-border rounded-lg p-5 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-fg">
              <Trash2 size={16} className="text-rose-400" />
              <h3 className="font-bold text-[15px]">Delete conversation?</h3>
            </div>
            <p className="text-sm text-muted">
              All messages in this thread will be permanently removed.
            </p>
            <div className="flex gap-2 justify-end mt-1">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="h-9 px-4 rounded border border-border text-muted hover:text-fg text-[13px] font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDelete(pendingDelete)}
                className="h-9 px-4 rounded bg-rose-500 text-white text-[13px] font-semibold hover:brightness-110"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
