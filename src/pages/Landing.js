import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageCircle,
  Repeat2,
  Heart,
  Eye,
  Share,
  Home,
  Trophy,
  Plus,
  Lock,
  User,
} from 'lucide-react';
import {
  PRIVACY_BODY,
  PRIVACY_TITLE,
  TERMS_BODY,
  TERMS_TITLE,
} from '../components/LegalContent';
import LegalModal from '../components/LegalModal';

const FEED_POSTS = [
  {
    initial: 'A',
    color: '#ef4444',
    name: 'Alex Rivera',
    handle: '@alex',
    time: '2h',
    streak: 47,
    body: 'Hit 4.2 miles before sunrise. Lungs are dying but streak alive.',
    stats: { c: 12, r: 4, l: 89, v: '1.2K' },
  },
  {
    initial: 'M',
    color: '#3b82f6',
    name: 'Mia Chen',
    handle: '@mia',
    time: '5h',
    streak: 22,
    body: 'Shipped onboarding rewrite. 14 signups since lunch.',
    stats: { c: 3, r: 1, l: 41, v: 312 },
  },
  {
    initial: 'S',
    color: '#a855f7',
    name: 'Sam Park',
    handle: '@sam',
    time: '7h',
    streak: 31,
    body: 'Day 31 of Spanish. Ordered coffee at the bodega without switching to English. Tiny win.',
    stats: { c: 5, r: 2, l: 58, v: 401 },
  },
  {
    initial: 'L',
    color: '#f59e0b',
    name: 'Lena Brooks',
    handle: '@lena',
    time: '9h',
    streak: 64,
    body: 'Closed customer #3 for the Shopify app today. $89 MRR — small, but real.',
    stats: { c: 8, r: 3, l: 72, v: 638 },
  },
];

const POLL_POST = {
  initial: 'D',
  color: '#10b981',
  name: 'Andre Okafor',
  handle: '@dre',
  time: '6h',
  streak: 88,
  question: "What's harder to stay consistent with?",
  options: [
    { emoji: '🏃', label: 'Working out', pct: 67 },
    { emoji: '📚', label: 'Reading daily', pct: 33 },
  ],
  meta: '234 votes · 2d left',
};

const BOTTOM_TABS = [
  { Icon: Home, label: 'Home', key: 'home' },
  { Icon: Trophy, label: 'Compete', key: 'compete' },
  { Icon: Plus, label: 'Post', key: 'post', accent: true },
  { Icon: Lock, label: 'Journal', key: 'journal' },
  { Icon: User, label: 'Profile', key: 'profile' },
];

const ABOUT_BODY = (
  <p>
    Strove is a social platform for people working on long-term goals. Document your journey day by day, build a public streak, find like-minded people, get motivation and accountability from a real community, and compete for a real cash prize every month voted on by the community.
  </p>
);

function FeatureItem({ n, title, children }) {
  return (
    <li>
      <strong className="block text-white font-bold mb-1">{n}. {title}</strong>
      {children}
    </li>
  );
}

const FEATURES_BODY = (
  <ul className="space-y-4">
    <FeatureItem n={1} title="Daily streaks">
      Check in every day to keep your streak alive. Miss a day and it resets.
    </FeatureItem>
    <FeatureItem n={2} title="Social feed">
      Post public updates, follow other people's journeys, like, comment, and share.
    </FeatureItem>
    <FeatureItem n={3} title="Private journal">
      Log private notes and get AI insights about your progress.
    </FeatureItem>
    <FeatureItem n={4} title="Monthly pot">
      Pay $1 to enter, post weekly, vote for someone else, one winner takes the whole pot.
    </FeatureItem>
  </ul>
);

const COMPETE_BODY = (
  <>
    <p>
      The Monthly Pot is Strove's community competition. Every month, qualified entrants compete for a single cash prize voted on by the entrants themselves.
    </p>
    <ul className="list-disc pl-5 space-y-1.5">
      <li>$1 to enter the pot.</li>
      <li>Entries close the 15th of each month.</li>
      <li>Check in daily to stay eligible.</li>
      <li>Post at least once a week to stay eligible.</li>
      <li>
        Voting opens immediately when you enter the pot. You must cast your vote for another competitor before the draw closes at the end of the month to remain eligible to win. One vote per person, anonymous, you cannot vote for yourself.
      </li>
      <li>One winner takes the entire pot.</li>
      <li>Minimum 100 qualified competitors or the pot rolls to the next month.</li>
      <li>First pot goes live at 1,000 users.</li>
    </ul>
  </>
);

const SUPPORT_BODY = (
  <>
    <p>
      Need help? Email{' '}
      <a href="mailto:support@strove.app?subject=Strove%20Support%20Request" className="text-orange font-semibold hover:underline">
        support@strove.app
      </a>
      . We reply within 24 hours.
    </p>
    <div>
      <h3 className="text-white font-semibold text-[14px] mb-1">Quick answers</h3>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><span className="text-white font-medium">Enter the Monthly Pot:</span> Compete tab → Enter the Pot for $1. Entries close on the 15th.</li>
        <li><span className="text-white font-medium">Voting:</span> Paid competitors get one anonymous vote. Vote before the draw closes. No self-votes.</li>
        <li><span className="text-white font-medium">No winner?</span> Under 100 qualified competitors → pot rolls to next month.</li>
        <li><span className="text-white font-medium">Reset password:</span> Login page → Forgot password (email or phone).</li>
        <li><span className="text-white font-medium">Delete account:</span> Profile → Settings → Delete Account.</li>
      </ul>
    </div>
  </>
);

const FOOTER_LINKS = [
  { key: 'about', label: 'About', title: 'About Strove', body: ABOUT_BODY },
  { key: 'features', label: 'Features', title: 'Features', body: FEATURES_BODY },
  { key: 'compete', label: 'Compete', title: 'The Monthly Pot', body: COMPETE_BODY },
  { key: 'support', label: 'Support', title: 'Help & Support', body: SUPPORT_BODY },
  { key: 'privacy', label: 'Privacy', title: PRIVACY_TITLE, body: PRIVACY_BODY },
  { key: 'terms', label: 'Terms', title: TERMS_TITLE, body: TERMS_BODY },
];

// Bare image — mix-blend-mode: screen erases the PNG's baked-in black square
// so the flame blends seamlessly on any black/near-black surface.
function LogoImg({ size = 28, className = '' }) {
  return (
    <img
      src={process.env.PUBLIC_URL + '/logo.png'}
      alt=""
      width={size}
      height={size}
      className={'object-contain ' + className}
      style={{
        background: 'transparent',
        backgroundColor: 'transparent',
        border: 0,
        borderRadius: 0,
        boxShadow: 'none',
        padding: 0,
        mixBlendMode: 'screen',
      }}
    />
  );
}

export default function Landing() {
  const [modal, setModal] = useState(null);

  return (
    <div className="min-h-dvh bg-black text-white font-sans flex flex-col">
      {/* Top nav */}
      <header className="border-b border-[#0f0f0f] relative z-30">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoImg size={28} />
            <span className="text-[18px] font-bold tracking-tight">Strove</span>
          </Link>
          <Link
            to="/login"
            className="h-9 px-5 grid place-items-center text-[13px] font-bold rounded bg-transparent text-white border border-white hover:bg-white hover:text-black transition-colors"
          >
            Log in
          </Link>
        </div>
      </header>

      {/* Hero with subtle radial bg */}
      <main className="flex-1 flex items-center relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 45%, #1a0800 0%, rgba(26,8,0,0.5) 35%, rgba(0,0,0,0) 70%)',
          }}
        />
        <div className="relative max-w-[1280px] w-full mx-auto px-6 lg:px-12 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-16 items-center">
          <section>
            <h1 className="text-[44px] sm:text-[56px] lg:text-[64px] leading-[1.02] font-black tracking-[-0.03em]">
              The Social Platform For People Who Don't Quit.
            </h1>
            <p className="mt-7 text-[18px] lg:text-[19px] leading-snug text-[#a1a1aa] max-w-[520px] font-normal">
              Better yourself. Find your people. Get rewarded for consistency.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/signup"
                className="h-12 px-6 grid place-items-center text-[15px] font-bold rounded bg-orange text-black hover:brightness-110 transition"
              >
                Create your account
              </Link>
              <Link
                to="/login"
                className="h-12 px-6 grid place-items-center text-[15px] font-bold rounded bg-transparent text-white border border-[#2a2a2a] hover:border-white/60 transition-colors"
              >
                Log in
              </Link>
            </div>
          </section>

          <section className="relative hidden lg:flex items-center justify-center min-h-[720px]">
            <BackPhone />
            <FrontPhone />
          </section>
        </div>
      </main>

      <footer
        className="border-t border-[#0f0f0f] relative z-[50] mt-20"
        style={{ backgroundColor: 'red' }}
      >
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-[#71717a]">
          {FOOTER_LINKS.map((l) => (
            <button
              key={l.key}
              className="hover:text-white transition-colors"
              onClick={() => setModal(l.key)}
            >
              {l.label}
            </button>
          ))}
          <span>© 2026 Strove</span>
        </div>
      </footer>

      {modal ? (() => {
        const item = FOOTER_LINKS.find((l) => l.key === modal);
        if (!item) return null;
        return (
          <LegalModal
            title={item.title}
            body={item.body}
            onClose={() => setModal(null)}
          />
        );
      })() : null}
    </div>
  );
}

/* ===========================================================
   Phone chrome
   =========================================================== */
function PhoneFrame({ children, width = 320, height = 660, className = '', style }) {
  return (
    <div
      className={'rounded-[44px] bg-black border border-[#1a1a1a] p-3 ' + className}
      style={{ width, height, ...style }}
    >
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[100px] h-[26px] rounded-[14px] bg-black z-10" />
      <div className="h-full rounded-[34px] bg-black pt-9 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}

function PhoneTopBar({ avatarColor = '#f97316', avatarLabel = 'A' }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a1a]">
      <div className="flex items-center gap-2">
        <LogoImg size={20} />
        <span className="text-[14px] font-bold tracking-tight">Strove</span>
      </div>
      <div
        className="h-7 w-7 rounded-full grid place-items-center text-[11px] font-bold"
        style={{ backgroundColor: avatarColor, color: avatarColor === '#f97316' ? '#000' : '#fff' }}
      >
        {avatarLabel}
      </div>
    </div>
  );
}

function FakeTabs() {
  return (
    <div
      className="flex border-b border-[#1a1a1a] px-4 select-none"
      style={{ pointerEvents: 'none' }}
    >
      <div className="relative flex-1 py-2 text-[12px] font-semibold text-white text-center">
        Discover
        <span className="absolute left-1/2 -translate-x-1/2 bottom-0 h-[2px] w-6 bg-orange" />
      </div>
      <div className="flex-1 py-2 text-[12px] font-semibold text-[#71717a] text-center">Following</div>
    </div>
  );
}

function PhoneBottomNav({ activeKey }) {
  return (
    <nav className="border-t border-[#1a1a1a] grid grid-cols-5 gap-1 px-2 pt-1.5 pb-2">
      {BOTTOM_TABS.map((t) => {
        const active = t.key === activeKey;
        return (
          <div key={t.key} className="flex flex-col items-center gap-0.5 py-1">
            <span
              className={
                'grid place-items-center ' +
                (t.accent
                  ? 'h-8 w-8 rounded bg-orange text-black'
                  : active
                  ? 'h-7 w-7 rounded bg-orange/15 text-orange'
                  : 'h-7 w-7 text-[#71717a]')
              }
            >
              <t.Icon size={16} strokeWidth={1.8} />
            </span>
            <span className={'text-[9px] font-medium ' + (active ? 'text-orange' : 'text-[#71717a]')}>{t.label}</span>
          </div>
        );
      })}
    </nav>
  );
}

/* ===========================================================
   FRONT PHONE — real app home: topbar + tabs + posts + poll + nav
   =========================================================== */
function FrontPhone() {
  return (
    <div
      className="relative z-20 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.95)]"
      style={{ transform: 'translateX(-40px)' }}
    >
      <PhoneFrame width={320} height={680} className="relative">
        <PhoneTopBar avatarColor="#f97316" avatarLabel="A" />

        <FakeTabs />

        {/* Feed — 5 items: 4 posts + 1 poll, mixed types */}
        <div className="flex-1 px-3 overflow-hidden">
          <PostRow post={FEED_POSTS[0]} divider />
          <PostRow post={FEED_POSTS[1]} divider />
          <PollPostRow post={POLL_POST} divider />
          <PostRow post={FEED_POSTS[2]} divider />
          <PostRow post={FEED_POSTS[3]} />
        </div>

        <PhoneBottomNav activeKey="home" />
      </PhoneFrame>
    </div>
  );
}

function PostRow({ post, divider }) {
  return (
    <article className={'flex gap-2.5 py-2.5 ' + (divider ? 'border-b border-[#1a1a1a]' : '')}>
      <div
        className="h-9 w-9 rounded-full grid place-items-center text-[13px] font-bold text-white shrink-0"
        style={{ backgroundColor: post.color }}
      >
        {post.initial}
      </div>
      <div className="flex-1 min-w-0">
        <PostHeader post={post} />
        <p className="mt-1 text-[12px] leading-[1.4] text-white font-normal">{post.body}</p>
        <div className="mt-1.5 flex items-center justify-between text-[#71717a] pr-2 text-[10.5px] font-medium">
          <span className="inline-flex items-center gap-1"><MessageCircle size={12} strokeWidth={1.8} />{post.stats.c}</span>
          <span className="inline-flex items-center gap-1"><Repeat2 size={12} strokeWidth={1.8} />{post.stats.r}</span>
          <span className="inline-flex items-center gap-1"><Heart size={12} strokeWidth={1.8} />{post.stats.l}</span>
          <span className="inline-flex items-center gap-1"><Eye size={12} strokeWidth={1.8} />{post.stats.v}</span>
          <Share size={12} strokeWidth={1.8} />
        </div>
      </div>
    </article>
  );
}

function PostHeader({ post }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap text-[11.5px]">
      <span className="font-bold text-white">{post.name}</span>
      <span className="inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded bg-orange text-black text-[9.5px] font-bold leading-none">
        🔥 {post.streak}
      </span>
      <span className="text-[#71717a] font-medium">{post.handle} · {post.time}</span>
    </div>
  );
}

function PollPostRow({ post, divider }) {
  return (
    <article className={'flex gap-2.5 py-2.5 ' + (divider ? 'border-b border-[#1a1a1a]' : '')}>
      <div
        className="h-9 w-9 rounded-full grid place-items-center text-[13px] font-bold text-white shrink-0"
        style={{ backgroundColor: post.color }}
      >
        {post.initial}
      </div>
      <div className="flex-1 min-w-0">
        <PostHeader post={post} />
        <p className="mt-1 text-[12px] leading-[1.4] text-white font-normal">{post.question}</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {post.options.map((o) => (
            <div
              key={o.label}
              className="relative h-7 rounded bg-[#0d0d0d] border border-[#1a1a1a] overflow-hidden flex items-center text-[10.5px] px-2"
            >
              <span
                className="absolute inset-y-0 left-0 bg-orange/20 border-r border-orange/50"
                style={{ width: o.pct + '%' }}
              />
              <span className="relative flex-1 flex items-center justify-between font-semibold">
                <span className="text-white">{o.emoji} {o.label}</span>
                <span className="text-orange font-bold">{o.pct}%</span>
              </span>
            </div>
          ))}
        </div>
        <div className="mt-1.5 text-[10px] text-[#71717a] font-medium">{post.meta}</div>
      </div>
    </article>
  );
}

/* ===========================================================
   BACK PHONE — Compete: topbar, Discover/Following tabs, pot stack, nav
   =========================================================== */
function BackPhone() {
  return (
    <div
      className="absolute z-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)]"
      style={{ transform: 'translate(220px, 60px) rotate(15deg)' }}
    >
      <PhoneFrame width={300} height={660} className="relative">
        <PhoneTopBar avatarColor="#3b82f6" avatarLabel="M" />
        <FakeTabs />

        <div className="flex-1 px-4 pt-5 pb-3 flex flex-col items-center gap-4 overflow-hidden">
          <div className="text-[11px] uppercase tracking-[0.25em] text-[#71717a] font-bold">June 2026 Pot</div>
          <div className="text-[52px] font-black tracking-tighter text-orange leading-none">
            <span className="text-[24px] align-super font-bold mr-0.5">$</span>4,820
          </div>

          <div className="w-full grid grid-cols-4 gap-1.5">
            {[
              { v: '12', l: 'DAYS' },
              { v: '08', l: 'HRS' },
              { v: '41', l: 'MIN' },
              { v: '17', l: 'SEC' },
            ].map((u) => (
              <div key={u.l} className="rounded bg-[#111] py-2 text-center">
                <div className="text-[18px] font-black tabular-nums text-white leading-none">{u.v}</div>
                <div className="text-[8.5px] uppercase tracking-wider text-[#71717a] mt-0.5 font-bold">{u.l}</div>
              </div>
            ))}
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-[10.5px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Active · Day 47
          </div>

          <div
            role="presentation"
            className="h-11 w-full rounded bg-orange text-black text-[13.5px] font-bold grid place-items-center select-none"
            style={{ pointerEvents: 'none', cursor: 'default' }}
          >
            Enter the pot ($1)
          </div>

          <div className="w-full flex flex-col items-center gap-0.5 pt-0.5 text-[10px] text-[#71717a] font-medium">
            <span>847 competitors this month</span>
            <span>🏆 Last winner took $3,240</span>
          </div>
        </div>

        <PhoneBottomNav activeKey="compete" />
      </PhoneFrame>
    </div>
  );
}
