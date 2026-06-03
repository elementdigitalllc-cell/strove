import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Settings, Pencil } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import {
  getProfile,
  getProfileByUsername,
  getPostsByUser,
  getFollowers,
  getFollowing,
  follow,
  unfollow,
  updateProfile,
  getMyPotEntry,
} from '../lib/sdb';
import PostCard from '../components/PostCard';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { LoadingBlock, ErrorBlock, Toast } from '../components/ui/States';

function fmtJoined(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function Profile() {
  const { user: me, refresh, logout } = useAuth();
  const { id } = useParams();
  const targetId = id || me?.id;

  const [target, setTarget] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [myFollowing, setMyFollowing] = useState([]);
  const [potEntry, setPotEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    if (!targetId || !me) return;
    setLoading(true);
    setError(null);

    // targetId may be a uuid or username; try uuid first
    let { data: prof, error: err1 } = await getProfile(targetId);
    if (!prof) {
      const { data: byName } = await getProfileByUsername(targetId);
      prof = byName;
    }
    if (!prof) {
      setError(err1 || new Error('User not found.'));
      setLoading(false);
      return;
    }

    const [postsR, followersR, followingR, mineR, potR] = await Promise.all([
      getPostsByUser(prof.id),
      getFollowers(prof.id),
      getFollowing(prof.id),
      getFollowing(me.id),
      getMyPotEntry(prof.id),
    ]);
    setTarget(prof);
    setPosts(postsR.data || []);
    setFollowers(followersR.data || []);
    setFollowingList(followingR.data || []);
    setMyFollowing(mineR.data || []);
    setPotEntry(potR.data);
    setLoading(false);
  }, [targetId, me]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingBlock label="Loading profile…" />;
  if (error) return <ErrorBlock error={error} onRetry={load} />;
  if (!target) return <div className="text-center text-muted py-12">User not found.</div>;

  const isMe = target.id === me?.id;
  const isFollowing = myFollowing.includes(target.id);
  const showWhy = potEntry && potEntry.why_i_should_win?.trim();

  async function toggleFollow() {
    if (isFollowing) {
      await unfollow(me.id, target.id);
      setMyFollowing((p) => p.filter((x) => x !== target.id));
      setFollowers((p) => p.filter((x) => x !== me.id));
    } else {
      await follow(me.id, target.id);
      setMyFollowing((p) => [...p, target.id]);
      setFollowers((p) => [...p, me.id]);
    }
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="flex items-start justify-between">
          <Avatar name={target.full_name || target.username || '?'} size="2xl" gradient />
          <div className="flex items-center gap-2">
            {isMe ? (
              <>
                <button onClick={() => setSettingsOpen(true)} className="h-10 w-10 grid place-items-center rounded-full border border-border text-muted hover:text-fg" aria-label="Settings">
                  <Settings size={18} />
                </button>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Pencil size={14} /> Edit profile
                </Button>
              </>
            ) : (
              <Button size="sm" variant={isFollowing ? 'outline' : 'primary'} onClick={toggleFollow}>
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{target.full_name || target.username}</h1>
          <div className="text-sm text-muted font-medium">@{target.username}</div>
        </div>

        {target.bio ? <p className="text-[15px] leading-relaxed font-normal">{target.bio}</p> : null}
        {target.goal ? <p className="text-[14px] text-muted leading-relaxed font-normal"><span className="text-orange font-semibold">Goal:</span> {target.goal}</p> : null}

        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl border border-orange/40 bg-gradient-to-br from-orange/15 to-amber/5 shadow-[0_6px_22px_-8px_rgba(249,115,22,0.35)]">
          <span className="text-2xl">🔥</span>
          <div>
            <div className="text-2xl font-extrabold text-orange-400 leading-none">{target.streak_count || 0}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted font-semibold mt-0.5">day streak</div>
          </div>
          {potEntry ? <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/40">In the pot</span> : null}
        </div>

        <div className="flex items-center gap-4 text-sm">
          <Stat label="Posts" value={posts.length} />
          <Sep />
          <Stat label="Followers" value={followers.length} />
          <Sep />
          <Stat label="Following" value={followingList.length} />
        </div>

        <div className="text-[12px] text-muted font-normal">Joined {fmtJoined(target.joined_at)}</div>
      </section>

      {showWhy ? (
        <section className="rounded-2xl border-l-4 border-l-orange border-y border-r border-border bg-card p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-orange-400 mb-1.5">📌 Pinned · Why I should win the pot</div>
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{potEntry.why_i_should_win}</p>
        </section>
      ) : null}

      <section className="-mx-4">
        <h3 className="px-4 mb-2 text-[13px] font-bold uppercase tracking-wider text-muted">Posts</h3>
        {posts.length === 0 ? (
          <div className="mx-4 text-center text-muted py-12 font-normal">No posts yet.</div>
        ) : posts.map((p) => <PostCard key={p.id} post={p} />)}
      </section>

      {editing ? (
        <EditModal target={target} onClose={() => setEditing(false)} onSaved={async () => {
          setEditing(false);
          await refresh();
          await load();
        }} />
      ) : null}
      {settingsOpen ? (
        <SettingsModal user={target} onClose={() => setSettingsOpen(false)} onLogout={async () => { setSettingsOpen(false); await logout(); }} />
      ) : null}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col">
      <strong className="text-base font-extrabold leading-none">{value}</strong>
      <span className="text-[11px] uppercase tracking-wider text-muted font-semibold mt-1">{label}</span>
    </div>
  );
}
function Sep() { return <div className="w-px h-7 bg-border" />; }

function EditModal({ target, onClose, onSaved }) {
  const [fullName, setFullName] = useState(target.full_name || '');
  const [bio, setBio] = useState(target.bio || '');
  const [goal, setGoal] = useState(target.goal || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    const { error } = await updateProfile(target.id, {
      full_name: fullName.trim() || target.username,
      bio: bio.trim() || null,
      goal: goal.trim() || null,
    });
    setBusy(false);
    if (error) return setError(error.message);
    onSaved();
  }

  return (
    <Modal title="Edit profile" onClose={onClose}>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-muted">Display name</span>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-muted">Bio</span>
        <Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A line or two about what you're chasing." />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-muted">Goal</span>
        <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Run a sub-20 5K" />
      </label>
      {error ? <Toast>{error}</Toast> : null}
      <div className="flex justify-end gap-2 mt-2">
        <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
      </div>
    </Modal>
  );
}

function SettingsModal({ user, onClose, onLogout }) {
  return (
    <Modal title="Settings" onClose={onClose}>
      <Section title="Account">
        <Row label="Username">@{user.username}</Row>
      </Section>
      <Section title="Privacy">
        <Row label="Journal">Private to you</Row>
      </Section>
      <div className="flex justify-end gap-2 mt-2">
        <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
        <Button size="sm" variant="ghost" onClick={onLogout}>Log out</Button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4 bg-black/70 backdrop-blur" onClick={onClose}>
      <div className="w-full max-w-[440px] bg-card border border-border rounded-3xl p-5 max-h-[calc(100dvh-40px)] overflow-y-auto flex flex-col gap-3.5" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button className="text-muted hover:text-fg" onClick={onClose} aria-label="Close">✕</button>
        </header>
        {children}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[11px] uppercase tracking-wider font-bold text-muted">{title}</div>
      <ul className="bg-bg/40 border border-border rounded-xl divide-y divide-border overflow-hidden">{children}</ul>
    </div>
  );
}
function Row({ label, children }) {
  return (
    <li className="flex justify-between px-3.5 py-3 text-sm">
      <span>{label}</span>
      <span className="text-muted font-normal">{children}</span>
    </li>
  );
}
