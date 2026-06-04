import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Send } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import {
  getConversationById,
  listMessages,
  sendMessage,
  markConversationMessagesRead,
} from '../lib/sdb';
import { supabase } from '../supabaseClient';
import { Avatar } from '../components/ui/Avatar';
import { LoadingBlock } from '../components/ui/States';

export default function MessageThread() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!user?.id || !conversationId) return;
    let cancelled = false;
    (async () => {
      const [{ data: convo }, { data: msgs }] = await Promise.all([
        getConversationById(conversationId, user.id),
        listMessages(conversationId),
      ]);
      if (cancelled) return;
      if (!convo) {
        navigate('/messages', { replace: true });
        return;
      }
      setConversation(convo);
      setMessages(msgs);
      setLoading(false);
      const { updatedCount } = await markConversationMessagesRead(conversationId, user.id);
      console.log('[MessageThread] mark-as-read updated rows =', updatedCount);
      window.dispatchEvent(new CustomEvent('strove:refresh-dm-badge'));
    })();
    return () => { cancelled = true; };
  }, [conversationId, user?.id, navigate]);

  // Realtime: any INSERT on messages for this conversation appends locally.
  useEffect(() => {
    if (!conversationId || !user?.id) return;
    const channel = supabase
      .channel('messages-' + conversationId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'conversation_id=eq.' + conversationId,
        },
        (payload) => {
          console.log('[MessageThread] realtime INSERT', payload.new);
          setMessages((prev) =>
            prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]
          );
          if (payload.new.sender_id !== user.id) {
            (async () => {
              await markConversationMessagesRead(conversationId, user.id);
              window.dispatchEvent(new CustomEvent('strove:refresh-dm-badge'));
            })();
          }
        }
      )
      .subscribe((status) => console.log('[MessageThread] channel status =', status));
    return () => supabase.removeChannel(channel);
  }, [conversationId, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  async function submit(e) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !user?.id || sending) return;
    setSending(true);
    const optimistic = {
      id: 'pending-' + Date.now(),
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      is_read: false,
      _pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    const { data, error } = await sendMessage({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
    });
    setSending(false);
    if (error) {
      console.error('[MessageThread.submit] error:', error);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(content);
      return;
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === optimistic.id ? data : m)).filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
    );
  }

  const other = conversation?.other || {};
  const otherName = other.full_name || other.username || 'Conversation';

  return (
    <div className="-mx-4 flex flex-col min-h-[calc(100dvh-57px-96px)]">
      <div className="sticky top-[57px] z-10 bg-bg/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/messages')}
          aria-label="Back"
          className="h-8 w-8 grid place-items-center rounded text-muted hover:text-fg hover:bg-card transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <Link to={other.id ? '/profile/' + other.id : '#'} className="flex items-center gap-2.5 min-w-0">
          <Avatar name={otherName} size="sm" />
          <div className="min-w-0">
            <div className="font-bold text-fg text-[14.5px] truncate">{otherName}</div>
            {other.username ? (
              <div className="text-[12px] text-muted truncate">@{other.username}</div>
            ) : null}
          </div>
        </Link>
      </div>

      {loading ? (
        <LoadingBlock label="Loading messages…" />
      ) : (
        <div className="flex-1 px-4 py-4 flex flex-col gap-2 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-muted py-8">
              Say hello to {otherName}.
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div
                  key={m.id}
                  className={'flex ' + (mine ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={
                      'max-w-[78%] px-3.5 py-2 rounded-[18px] text-[14.5px] leading-snug whitespace-pre-wrap break-words ' +
                      (mine
                        ? 'bg-orange text-black rounded-br-md'
                        : 'bg-card text-fg border border-border rounded-bl-md')
                    }
                  >
                    {m.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <form
        onSubmit={submit}
        className="sticky bottom-[64px] mx-4 mb-2 mt-3 flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={'Message ' + (other.username ? '@' + other.username : '')}
          maxLength={1000}
          className="flex-1 h-9 bg-transparent text-fg text-[14.5px] placeholder:text-muted/70 outline-none px-1"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          aria-label="Send"
          className="h-9 w-9 grid place-items-center rounded-full bg-orange text-black disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
