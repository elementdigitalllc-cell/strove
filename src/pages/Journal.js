import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Search } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { getJournalNotes, addJournalNote, updateJournalNote, deleteJournalNote, getPostsByUser } from '../lib/sdb';
import { Textarea } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { LoadingBlock, ErrorBlock, Toast } from '../components/ui/States';
import { cn } from '../lib/cn';

const AI = [
  (u, posts) => posts.length === 0
    ? "You haven't posted in a while. Even one line counts — momentum beats perfection."
    : 'Streaks compound. Each day you show up makes tomorrow easier, not harder.',
  (u) => (u.streak_count || 0) >= 7
    ? (u.streak_count || 0) + ' days in. Most people quit at 14. Past that, identity starts shifting.'
    : "First milestone: 7-day streak. That's when the work starts feeling automatic.",
  () => 'Public accountability hits 3x harder than private journaling. Post one update this week.',
  () => 'Energy management beats time management. Note what time of day you actually got the rep in.',
];

function timeAgo(ts) {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

export default function Journal() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const [notesR, postsR] = await Promise.all([
      getJournalNotes(user.id),
      getPostsByUser(user.id),
    ]);
    if (notesR.error) {
      setError(notesR.error);
      setLoading(false);
      return;
    }
    setNotes(notesR.data || []);
    setMyPosts(postsR.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const insight = useMemo(() => {
    if (!user) return '';
    const idx = Math.floor(Date.now() / 86_400_000) % AI.length;
    return AI[idx](user, myPosts);
  }, [user, myPosts]);

  async function add(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    setActionError('');
    const { data, error } = await addJournalNote(user.id, draft.trim());
    setBusy(false);
    if (error) return setActionError(error.message);
    setNotes((p) => [data, ...p]);
    setDraft('');
  }

  function startEdit(n) {
    setEditingId(n.id);
    setEditText(n.content);
  }

  async function saveEdit() {
    if (!editText.trim()) return;
    setBusy(true);
    setActionError('');
    const { data, error } = await updateJournalNote(editingId, editText.trim());
    setBusy(false);
    if (error) return setActionError(error.message);
    setNotes((p) => p.map((n) => n.id === editingId ? data : n));
    setEditingId(null);
    setEditText('');
  }

  async function remove(id) {
    setActionError('');
    const { error } = await deleteJournalNote(id);
    if (error) return setActionError(error.message);
    setNotes((p) => p.filter((n) => n.id !== id));
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return notes;
    const q = query.toLowerCase();
    return notes.filter((n) => (n.content || '').toLowerCase().includes(q));
  }, [notes, query]);

  if (loading) return <LoadingBlock label="Loading journal…" />;
  if (error) return <ErrorBlock error={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <section
        className="relative overflow-hidden rounded border border-violet/50 p-4"
        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.22), rgba(168,85,247,0.08)), #1a1530' }}
      >
        <div className="text-[11px] font-bold uppercase tracking-wider text-violet-300 mb-2">✨ AI Insight · today</div>
        <p className="text-[15px] leading-relaxed">{insight}</p>
      </section>

      <section className="grid grid-cols-3 gap-2">
        {[
          { v: user?.streak_count || 0, l: 'day streak' },
          { v: myPosts.length, l: 'public posts' },
          { v: notes.length, l: 'notes' },
        ].map((s) => (
          <div key={s.l} className="bg-card border border-border rounded py-3 text-center">
            <strong className="block text-2xl font-extrabold text-orange-400 leading-none">{s.v}</strong>
            <span className="block text-[11px] uppercase tracking-wider text-muted font-semibold mt-1.5">{s.l}</span>
          </div>
        ))}
      </section>

      <form onSubmit={add} className="flex flex-col gap-3">
        <Textarea rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What did you learn today? What got in the way?" />
        {actionError ? <Toast>{actionError}</Toast> : null}
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted font-normal">🔒 Visible only to you.</span>
          <Button size="sm" type="submit" disabled={!draft.trim() || busy}>
            {busy ? 'Saving…' : 'Save note'}
          </Button>
        </div>
      </form>

      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded bg-card border border-border text-muted">
        <Search size={16} />
        <input className="flex-1 bg-transparent outline-none text-sm text-fg" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search past notes" />
      </div>

      <section className="flex flex-col gap-2.5">
        {filtered.length === 0 ? (
          <div className="rounded border border-border bg-card p-9 text-center flex flex-col items-center gap-2">
            <div className="text-4xl">📓</div>
            <div className="font-bold">{query.trim() ? 'No matches' : 'Your log is empty'}</div>
            <div className="text-sm text-muted font-normal">{query.trim() ? 'Try a different word.' : 'Drop a thought above.'}</div>
          </div>
        ) : filtered.map((n) => (
          <article key={n.id} className="rounded border border-border bg-card p-3.5">
            <header className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">📝 Note</span>
              <span className="text-[11px] text-muted font-normal ml-1">{timeAgo(n.created_at)}</span>
              {editingId !== n.id ? (
                <button className="ml-auto h-7 w-7 grid place-items-center text-muted hover:text-fg" onClick={() => startEdit(n)} aria-label="Edit">
                  <Pencil size={14} />
                </button>
              ) : null}
              <button className={cn('h-7 w-7 grid place-items-center text-muted hover:text-fg', editingId === n.id && 'ml-auto')} onClick={() => remove(n.id)} aria-label="Delete">✕</button>
            </header>
            {editingId === n.id ? (
              <>
                <Textarea rows={4} value={editText} onChange={(ev) => setEditText(ev.target.value)} />
                <div className="flex justify-end gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditText(''); }}>Cancel</Button>
                  <Button size="sm" onClick={saveEdit} disabled={!editText.trim() || busy}>{busy ? 'Saving…' : 'Save'}</Button>
                </div>
              </>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap font-normal">{n.content}</p>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
