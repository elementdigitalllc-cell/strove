import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import {
  getCurrentPotEntries,
  getMyPotEntry,
  enterPot,
  updatePotEntryWhy,
  getMyVote,
  castVote,
  clearMyVote,
} from '../lib/sdb';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Input';
import { Tabs, TabsList, TabsPill, TabsContent } from '../components/ui/Tabs';
import { Avatar } from '../components/ui/Avatar';
import { StreakPill } from '../components/ui/Pill';
import { LoadingBlock, ErrorBlock, Toast } from '../components/ui/States';
import { cn } from '../lib/cn';

const RULES = [
  '$1 to enter the monthly pot.',
  'Check in every day to keep your streak alive.',
  'Post 1 public update per week to stay eligible.',
  'Winner takes all.',
  'You must vote for one other person before voting closes to stay eligible.',
  'Entries close the 15th of each month.',
  'All vote counts are anonymous.',
  'Minimum 100 qualified competitors or the pot rolls over.',
  'First pot goes live at 1,000 users.',
  'Each entrant must write a public "why I should win" statement pinned to their profile.',
  'Voting is completely public.',
  'One vote per person.',
];

function nextEntryDeadline() {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59);
  if (now > target) target.setMonth(target.getMonth() + 1);
  return target;
}

function splitDiff(ms) {
  const safe = Math.max(0, ms);
  return {
    day: Math.floor(safe / 86400000),
    hr: Math.floor(safe / 3600000) % 24,
    min: Math.floor(safe / 60000) % 60,
    sec: Math.floor(safe / 1000) % 60,
  };
}
const pad = (n) => String(n).padStart(2, '0');
const monthLabel = () => new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

export default function Compete() {
  const { user } = useAuth();
  const [tab, setTab] = useState('pot');
  const [entries, setEntries] = useState([]);
  const [myEntry, setMyEntry] = useState(null);
  const [myVote, setMyVote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const [entriesR, mineR, voteR] = await Promise.all([
      getCurrentPotEntries(),
      getMyPotEntry(user.id),
      getMyVote(user.id),
    ]);
    if (entriesR.error) {
      setError(entriesR.error);
      setLoading(false);
      return;
    }
    setEntries(entriesR.data || []);
    setMyEntry(mineR.data || null);
    setMyVote(voteR.data || null);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const deadline = useMemo(() => nextEntryDeadline(), []);
  const rem = splitDiff(deadline.getTime() - now);
  const inPot = Boolean(myEntry);
  const potAmount = entries.length; // $1 per entrant

  if (loading) return <LoadingBlock label="Loading pot…" />;
  if (error) return <ErrorBlock error={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <section
        className="relative overflow-hidden rounded border border-orange/30 p-6 text-center"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(249,115,22,0.35), transparent 60%), radial-gradient(circle at 80% 100%, rgba(245,158,11,0.25), transparent 60%), #111113',
        }}
      >
        <div className="text-[12px] uppercase tracking-wider font-bold text-muted mb-1">{monthLabel()} pot</div>
        <div className="text-[clamp(72px,16vw,108px)] font-extrabold tracking-tighter leading-none bg-gradient-to-br from-orange-400 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_8px_32px_rgba(249,115,22,0.55)] my-2">
          <span className="text-[0.5em] align-super mr-1">$</span>
          {potAmount.toLocaleString()}
        </div>
        <div className="grid grid-cols-4 gap-1.5 mt-4">
          {[
            { l: 'days', v: rem.day }, { l: 'hrs', v: rem.hr },
            { l: 'min', v: rem.min }, { l: 'sec', v: rem.sec },
          ].map((u) => (
            <div key={u.l} className="rounded py-3 bg-[#050506] border border-[#1f1f24] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_4px_14px_rgba(0,0,0,0.5)]">
              <div className="text-[26px] font-extrabold tabular-nums text-amber-400 [text-shadow:0_0_18px_rgba(245,158,11,0.4)]">{pad(u.v)}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted mt-0.5 font-semibold">{u.l}</div>
            </div>
          ))}
        </div>
        <div className="text-[12px] text-muted mt-2.5 font-normal">
          until entries close · {deadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        </div>
        <div className="mt-3.5 flex items-center justify-center gap-3">
          <div className="flex flex-col items-center">
            <strong className="text-lg font-bold">{entries.length}</strong>
            <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">competitors</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-muted" />
          <div className={cn('text-[13px] font-bold px-3 py-1 rounded border', inPot ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' : 'bg-card text-muted border-border')}>
            {inPot ? "You're in" : 'Not entered'}
          </div>
        </div>
      </section>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="pill" className="w-full">
          <TabsPill value="pot">The Pot</TabsPill>
          <TabsPill value="vote">Vote</TabsPill>
        </TabsList>

        <TabsContent value="pot">
          <PotTab user={user} entries={entries} myEntry={myEntry} myVote={myVote} reload={load} />
        </TabsContent>
        <TabsContent value="vote">
          <VoteTab user={user} entries={entries} myVote={myVote} reload={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PotTab({ user, entries, myEntry, myVote, reload }) {
  const [why, setWhy] = useState(myEntry?.why_i_should_win || '');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setWhy(myEntry?.why_i_should_win || '');
  }, [myEntry]);

  async function join() {
    if (!why.trim()) { setEditing(true); return; }
    setBusy(true);
    setError('');
    const { error } = await enterPot(user.id, why.trim());
    setBusy(false);
    if (error) return setError(error.message);
    await reload();
  }

  async function saveWhy() {
    if (!why.trim()) return;
    setBusy(true);
    setError('');
    if (myEntry) {
      const { error } = await updatePotEntryWhy(user.id, why.trim());
      if (error) { setBusy(false); return setError(error.message); }
    } else {
      const { error } = await enterPot(user.id, why.trim());
      if (error) { setBusy(false); return setError(error.message); }
    }
    setBusy(false);
    setEditing(false);
    await reload();
  }

  return (
    <div className="space-y-4">
      <section className="rounded border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-muted">Your "why I should win" statement</h3>
          {!editing && myEntry?.why_i_should_win ? (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
          ) : null}
        </div>
        {editing || !myEntry?.why_i_should_win ? (
          <>
            <Textarea rows={4} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Tell people why the pot should go to you." />
            {error ? <Toast>{error}</Toast> : null}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={saveWhy} disabled={!why.trim() || busy}>
                {busy ? 'Saving…' : myEntry ? 'Save' : 'Save & enter'}
              </Button>
              {myEntry?.why_i_should_win ? (
                <Button size="sm" variant="outline" onClick={() => { setWhy(myEntry.why_i_should_win); setEditing(false); }}>Cancel</Button>
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{myEntry.why_i_should_win}</p>
        )}
      </section>

      <section className="rounded border border-border bg-card p-4">
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-muted mb-2">Your status</h3>
        {myEntry ? (
          <>
            <p className="text-emerald-400 font-semibold text-sm mb-2">You're entered. Stay active to stay eligible.</p>
            <ul className="text-sm text-muted leading-relaxed font-normal space-y-0.5">
              <li>{(user.streak_count || 0) >= 1 ? '✓' : '·'} Daily check-in (streak {user.streak_count || 0})</li>
              <li>· Post one public update each week</li>
              <li>{myVote ? '✓' : '·'} Cast your vote before voting closes</li>
            </ul>
          </>
        ) : (
          <>
            <p className="text-sm text-muted mb-3 font-normal">Entry is $1. Winner takes the whole pot.</p>
            <Button full onClick={join} disabled={busy}>{busy ? 'Joining…' : 'Enter the pot ($1)'}</Button>
            {error ? <div className="mt-2"><Toast>{error}</Toast></div> : null}
          </>
        )}
      </section>

      <section className="rounded border border-border bg-card p-4">
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-muted mb-3">Rules</h3>
        <ol className="space-y-1.5">
          {RULES.map((r, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-muted font-normal leading-relaxed">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange shrink-0" />
              <span><span className="font-bold text-fg/80 mr-1.5">{i + 1}.</span>{r}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded border border-border bg-card p-4">
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-muted mb-3">All competitors ({entries.length})</h3>
        {entries.length === 0 ? (
          <div className="text-center text-sm text-muted py-8 font-normal">No one has entered this month yet. Be the first.</div>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((e) => {
              const p = e.profiles || {};
              return (
                <li key={e.id} className="py-3 flex gap-3">
                  <Link to={'/profile/' + p.id}><Avatar name={p.full_name || p.username || '?'} size="md" /></Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-sm">{p.full_name || p.username}</span>
                      <span className="text-muted text-xs font-medium">@{p.username}</span>
                      <StreakPill count={p.streak_count || 0} />
                    </div>
                    <p className="text-[13px] text-muted leading-relaxed font-normal whitespace-pre-wrap">
                      {e.why_i_should_win || 'No statement yet.'}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function VoteTab({ user, entries, myVote, reload }) {
  const [busy, setBusy] = useState(false);
  const candidates = useMemo(
    () => entries
      .filter((e) => e.user_id !== user.id)
      .sort((a, b) => (b.profiles?.streak_count || 0) - (a.profiles?.streak_count || 0)),
    [entries, user.id]
  );
  const myCandidate = entries.find((e) => e.user_id === myVote?.candidate_id);

  async function vote(targetId) {
    setBusy(true);
    await castVote(user.id, targetId);
    setBusy(false);
    await reload();
  }
  async function unvote() {
    setBusy(true);
    await clearMyVote(user.id);
    setBusy(false);
    await reload();
  }

  return (
    <div className="space-y-4">
      <header className="rounded border border-border bg-card p-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">Pick who deserves the pot</h2>
          <p className="text-[13px] text-muted font-normal">One vote per person. Tallies are anonymous.</p>
        </div>
        {myVote ? (
          <div className="text-xs flex items-center gap-2 bg-emerald-500/12 border border-emerald-500/30 text-muted px-3 py-1.5 rounded">
            <span>Voted for</span>
            <Link to={'/profile/' + myVote.candidate_id} className="text-emerald-400 font-bold">@{myCandidate?.profiles?.username || '—'}</Link>
            <button className="text-muted hover:text-fg" onClick={unvote} disabled={busy}>Change</button>
          </div>
        ) : (
          <div className="text-xs bg-card border border-border text-muted px-3 py-1.5 rounded">Not voted yet</div>
        )}
      </header>

      {candidates.length === 0 ? (
        <div className="rounded border border-border bg-card p-9 text-center flex flex-col items-center gap-2">
          <div className="text-4xl">🗳️</div>
          <div className="font-bold">No competitors yet</div>
          <div className="text-sm text-muted font-normal">Once people enter, they'll show up here.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map((e, i) => {
            const p = e.profiles || {};
            const picked = myVote?.candidate_id === e.user_id;
            return (
              <article key={e.id} className={cn('relative rounded border bg-card p-4 transition', picked ? 'border-emerald-500/50 bg-emerald-500/[0.04]' : 'border-border hover:border-orange/30')}>
                <div className="absolute top-3 right-4 text-[11px] font-extrabold text-muted tracking-widest">#{i + 1}</div>
                <header className="flex items-center gap-3 mb-3">
                  <Link to={'/profile/' + p.id}><Avatar name={p.full_name || p.username || '?'} size="lg" /></Link>
                  <div className="flex-1 min-w-0">
                    <Link to={'/profile/' + p.id} className="block font-bold text-base">{p.full_name || p.username}</Link>
                    <span className="text-xs text-muted">@{p.username}</span>
                  </div>
                  <StreakPill count={p.streak_count || 0} size="lg" />
                </header>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{e.why_i_should_win || 'No statement yet.'}</p>
                <div className="mt-3">
                  <Button full variant={picked ? 'primary' : 'ghost'} disabled={busy} onClick={() => picked ? unvote() : vote(e.user_id)}>
                    {picked ? '✓ Voted' : 'Vote'}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
