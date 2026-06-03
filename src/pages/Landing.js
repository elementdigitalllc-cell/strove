import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { Button } from '../components/ui/Button';

const FEATURES = [
  { label: 'Daily streaks', title: 'One tap. Chain alive.', body: 'Strove auto checks you in when you open the app. Miss a day, the chain breaks. The pressure is the point.' },
  { label: 'Public accountability', title: 'The whole feed sees you show up', body: 'Photos, videos, polls, or one-liners. Followers track your goal day by day — no fake highlight reel.' },
  { label: 'Real money pot', title: '$1 in. Winner takes all.', body: 'Every entrant pays $1, posts weekly, votes once. On the 15th, voting closes. One person walks away with the pot.' },
  { label: 'Private journal', title: 'A locked notebook + AI insights', body: 'Private logs only you see. AI flags patterns in your work and surfaces friction before you quit.' },
];

const TESTIMONIALS = [
  { name: 'Alex Rivera', handle: '@alex', body: "47-day streak. First time in my life I've done anything 47 days in a row.", streak: 47 },
  { name: 'Andre Okafor', handle: '@dre', body: 'Won the April pot. Funded the next 18 books on my list.', streak: 88 },
  { name: 'Mia Chen', handle: '@mia', body: 'Solo grind became a public scoreboard. Changed everything.', streak: 22 },
];

const FAQS = [
  { q: 'Is the pot real money?', a: 'Yes. Every entrant contributes $1. The full pot pays out to the winner. First pot goes live at 1,000 users.' },
  { q: 'What if nobody good enters?', a: 'Minimum 100 qualified competitors per month. Below that, the pot rolls over to the next month.' },
  { q: 'Can I just lurk?', a: 'Yes. Strove is a free streak tracker forever. The pot is opt-in.' },
  { q: 'How are votes counted?', a: 'Every entrant must vote for one other person before voting closes. All vote tallies are anonymous. One vote per person.' },
];

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative min-h-dvh bg-bg text-fg overflow-x-hidden">
      {/* orbs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full blur-[100px] bg-orange/40 opacity-50" />
        <div className="absolute top-1/4 -right-44 w-[540px] h-[540px] rounded-full blur-[100px] bg-amber/30 opacity-35" />
        <div className="absolute -bottom-52 left-1/3 w-[600px] h-[600px] rounded-full blur-[120px] bg-orange-600/30 opacity-30" />
      </div>

      {/* nav */}
      <header className={`sticky top-0 z-30 transition-all ${scrolled ? 'border-b border-border bg-bg/70 backdrop-blur-xl' : ''}`}>
        <div className="max-w-[1180px] mx-auto flex items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandLogo size={30} />
            <span className="text-xl font-extrabold tracking-tight">Strove</span>
          </Link>
          <nav className="hidden md:flex gap-7 text-sm text-muted">
            <a href="#features" className="hover:text-fg transition-colors">Features</a>
            <a href="#pot" className="hover:text-fg transition-colors">The pot</a>
            <a href="#faq" className="hover:text-fg transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <Link to="/login" className="px-3 py-2 text-sm font-semibold text-fg hover:text-orange transition-colors">Log in</Link>
            <Link to="/signup">
              <Button size="sm">Sign up</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative z-10 px-5 pt-10 md:pt-20 pb-16 md:pb-28">
        <div className="max-w-[1180px] mx-auto grid gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-16 items-center">
          <div className="max-w-[620px]">
            <span className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-orange-400 bg-orange/10 border border-orange/30 px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse-ring" />
              The long-game social platform
            </span>
            <h1 className="text-[42px] sm:text-[56px] md:text-[72px] font-extrabold leading-[1.02] tracking-tight text-balance">
              Get paid for working on{' '}
              <span className="bg-gradient-to-r from-orange via-amber-400 to-orange-400 bg-clip-text text-transparent bg-[length:200%_200%] animate-gradient-shift">
                yourself
              </span>
              .
            </h1>
            <p className="mt-5 text-[17px] md:text-lg text-muted leading-relaxed max-w-[540px] font-normal">
              Document your goal day by day. Build the streak. Compete in the monthly pot — real money, voted on by everyone grinding alongside you.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/signup">
                <Button size="lg" className="group">
                  Create your account
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="muted">I already have one</Button>
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-3.5">
              <div className="flex">
                {['A', 'M', 'D', '+'].map((c, i) => (
                  <span
                    key={c}
                    className={`-ml-2.5 first:ml-0 h-9 w-9 grid place-items-center rounded-full border-2 border-bg text-[13px] font-bold ${
                      i === 3 ? 'bg-orange-grad text-black' : 'bg-card text-orange-400'
                    }`}
                  >
                    {c}
                  </span>
                ))}
              </div>
              <div className="text-[13.5px] text-muted">
                <strong className="text-fg font-bold">3,481</strong> people building streaks today
              </div>
            </div>
          </div>

          <PhoneMockup />
        </div>
      </section>

      {/* marquee */}
      <section className="relative z-10 border-y border-border bg-black/30 py-3.5 overflow-hidden">
        <div className="flex">
          {Array.from({ length: 2 }).map((_, r) => (
            <div key={r} className="flex gap-7 shrink-0 pr-7 animate-marquee whitespace-nowrap">
              {['SHOW UP', 'STAY ON', 'POST DAILY', 'WIN THE POT', 'COMPOUND', 'NO HIGHLIGHT REELS', 'GET PAID'].map((w) => (
                <span key={w} className="text-[18px] font-bold tracking-wider text-muted">
                  {w} <span className="text-orange mx-1">●</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* features */}
      <section id="features" className="relative z-10 max-w-[980px] mx-auto px-5 py-20 md:py-28 grid gap-4 md:gap-5 md:grid-cols-2">
        {FEATURES.map((f, i) => (
          <article key={f.title} className="bg-card border border-border rounded-3xl p-6 transition hover:-translate-y-0.5 hover:border-orange/30">
            <div className="text-[11px] font-bold uppercase tracking-wider text-orange-400 mb-3">
              0{i + 1} · {f.label}
            </div>
            <h2 className="text-[22px] font-bold tracking-tight mb-2">{f.title}</h2>
            <p className="text-[15px] text-muted leading-relaxed font-normal">{f.body}</p>
          </article>
        ))}
      </section>

      {/* pot section */}
      <section id="pot" className="relative z-10 px-5 py-16 md:py-24">
        <div className="max-w-[1100px] mx-auto grid gap-10 md:grid-cols-[1fr_0.85fr] md:gap-16 items-center">
          <div className="max-w-[600px]">
            <span className="inline-flex text-[12px] font-bold uppercase tracking-wider text-orange-400 bg-orange/10 border border-orange/30 px-3 py-1.5 rounded-full">
              The monthly pot
            </span>
            <h2 className="mt-4 text-[28px] md:text-[42px] font-extrabold tracking-tight leading-[1.1] mb-4">
              Real money. One winner. Twelve rules.
            </h2>
            <p className="text-lg text-muted leading-relaxed mb-6 font-normal">
              $1 to enter. Post at least once a week. Vote for one other person before the 15th. The whole pot pays out to whoever the community picks.
            </p>
            <ul className="grid grid-cols-2 gap-2 mb-7">
              {['$1 to enter', 'Daily check-ins', 'Weekly public post', 'One anonymous vote', 'Winner takes all'].map((r) => (
                <li key={r} className="flex items-center gap-2 text-sm text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
            <Link to="/signup"><Button size="lg">Join the next pot</Button></Link>
          </div>
          <PotMockup />
        </div>
      </section>

      {/* quotes */}
      <section className="relative z-10 max-w-[1100px] mx-auto px-5 py-16">
        <h2 className="text-center text-[28px] md:text-[36px] font-extrabold tracking-tight">
          Built by people who already grind.
        </h2>
        <div className="mt-8 grid gap-3.5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <article key={t.handle} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-card border border-border grid place-items-center font-bold text-orange-400">{t.name[0]}</div>
                <div>
                  <div className="font-bold text-sm">{t.name}</div>
                  <div className="text-xs text-muted">{t.handle} · 🔥 {t.streak}</div>
                </div>
              </div>
              <p className="text-[14.5px] text-muted leading-relaxed font-normal">"{t.body}"</p>
            </article>
          ))}
        </div>
      </section>

      {/* faq */}
      <section id="faq" className="relative z-10 max-w-[800px] mx-auto px-5 py-16">
        <h2 className="text-center text-[28px] md:text-[36px] font-extrabold tracking-tight">Questions</h2>
        <div className="mt-8 flex flex-col gap-2">
          {FAQS.map((f) => (
            <FaqRow key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* final cta */}
      <section className="relative z-10 px-5 py-20 md:py-24 text-center flex flex-col items-center gap-5">
        <h2 className="text-[32px] md:text-[52px] font-extrabold tracking-tight leading-[1.05]">
          Stop{' '}
          <span className="bg-gradient-to-r from-orange to-amber-400 bg-clip-text text-transparent">starting over</span>.<br />
          Start showing up.
        </h2>
        <Link to="/signup">
          <Button size="lg" className="group">
            Create your account
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
        <p className="text-xs text-muted">Free to use. $1 to enter the pot. Cancel anytime.</p>
      </section>

      <footer className="relative z-10 border-t border-border bg-black/30">
        <div className="max-w-[1100px] mx-auto px-5 py-7 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={28} />
            <span className="text-fg font-extrabold">Strove</span>
          </div>
          <div>Get paid for working on yourself.</div>
          <div className="text-muted">© Strove</div>
        </div>
      </footer>
    </div>
  );
}

function FaqRow({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`bg-card border border-border rounded-2xl overflow-hidden transition-colors ${open ? 'border-orange/30' : ''}`}>
      <button className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left text-[15px] font-semibold" onClick={() => setOpen((v) => !v)}>
        <span>{q}</span>
        <span className="text-orange-400 text-xl w-6 text-center">{open ? '−' : '+'}</span>
      </button>
      <div className={`overflow-hidden transition-[max-height,padding] ${open ? 'max-h-[200px] px-5 pb-4' : 'max-h-0 px-5'}`}>
        <p className="text-[14.5px] text-muted leading-relaxed font-normal">{a}</p>
      </div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative min-h-[540px] grid place-items-center">
      <div className="relative w-[320px] h-[600px] rounded-[44px] border border-white/[0.06] p-3.5 -rotate-3 hover:-rotate-1 hover:-translate-y-1 transition-transform duration-500 shadow-[0_50px_80px_-20px_rgba(0,0,0,0.8)]" style={{ background: 'linear-gradient(160deg,#1c1c21 0%,#0d0d10 100%)' }}>
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-[100px] h-[26px] rounded-[14px] bg-black z-10" />
        <div className="h-full rounded-[32px] bg-bg pt-9 px-3.5 pb-3.5 flex flex-col gap-2.5 overflow-hidden">
          <div className="flex justify-between items-center pb-2 border-b border-border">
            <div className="flex items-center gap-1.5 text-[13px] font-bold">
              <BrandLogo size={22} />
              <span>Strove</span>
            </div>
            <div className="h-6 w-6 rounded-full bg-orange-grad grid place-items-center text-black text-[11px] font-bold">A</div>
          </div>
          <div className="flex gap-3.5 pb-1 border-b border-border">
            <button className="relative text-xs font-semibold text-fg py-1.5">Discover<span className="absolute left-0 right-0 -bottom-1 h-0.5 rounded-full bg-orange-grad" /></button>
            <button className="text-xs font-semibold text-muted py-1.5">Following</button>
          </div>
          {[
            { name: 'Alex Rivera', handle: '@alex · 2h', streak: 47, body: 'Hit 4.2 miles before sunrise. Lungs are dying but streak alive.', acts: ['💬 12', '🔁 4', '❤️ 89', '👁 1.2K'] },
            { name: 'Mia Chen', handle: '@mia · 5h', streak: 22, body: 'Shipped onboarding rewrite. 14 signups since lunch.', acts: ['💬 3', '🔁 1', '❤️ 41', '👁 312'] },
          ].map((p, i) => (
            <article key={i} className="flex gap-2.5 py-2.5 border-b border-border">
              <div className="h-7 w-7 rounded-full bg-card border border-border grid place-items-center text-xs font-bold text-orange-400">{p.name[0]}</div>
              <div className="flex-1 text-xs leading-snug">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <strong className="text-xs">{p.name}</strong>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold leading-none rounded-full bg-orange-grad text-black">🔥 {p.streak}</span>
                  <span className="text-muted text-[11px]">{p.handle}</span>
                </div>
                <p className="my-1">{p.body}</p>
                <div className="flex gap-2.5 text-muted text-[11px]">
                  {p.acts.map((a) => <span key={a}>{a}</span>)}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="absolute bottom-3 -right-1 rotate-6 px-4 py-3 rounded-2xl border border-orange/40 backdrop-blur bg-[linear-gradient(135deg,rgba(249,115,22,0.22),rgba(245,158,11,0.08))] flex items-center gap-2.5 shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
        <span className="text-2xl">🔥</span>
        <div>
          <div className="text-[22px] font-extrabold text-orange-400 leading-none">88</div>
          <div className="text-[10px] uppercase tracking-wider text-muted mt-0.5">day streak</div>
        </div>
      </div>
    </div>
  );
}

function PotMockup() {
  return (
    <div className="relative rounded-3xl border border-orange/30 p-7 text-center overflow-hidden shadow-[0_40px_80px_-20px_rgba(249,115,22,0.25)]" style={{
      background:
        'radial-gradient(circle at 30% 20%, rgba(249,115,22,0.38), transparent 60%), radial-gradient(circle at 80% 100%, rgba(245,158,11,0.28), transparent 60%), #111113',
    }}>
      <div className="text-[12px] uppercase tracking-wider font-bold text-muted">June pot</div>
      <div className="my-2 text-[60px] md:text-[72px] font-extrabold tracking-tighter leading-none bg-gradient-to-br from-orange-400 to-amber-400 bg-clip-text text-transparent">
        <span className="text-[0.5em] align-super mr-1">$</span>2,840
      </div>
      <div className="grid grid-cols-4 gap-1.5 mb-3.5">
        {['12', '08', '41', '17'].map((v, i) => (
          <div key={i} className="rounded-xl bg-black/40 border border-border py-2">
            <div className="text-[22px] font-extrabold tabular-nums">{v}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted mt-0.5">{['days', 'hrs', 'min', 'sec'][i]}</div>
          </div>
        ))}
      </div>
      <div className="text-[13px] text-muted mb-2.5">142 in · $1 to enter</div>
      <div className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-orange/20 text-orange-400">
        Winner takes all
      </div>
    </div>
  );
}
