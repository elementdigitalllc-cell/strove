import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, Mail, Search } from 'lucide-react';

const FAQS = [
  {
    q: 'How do I enter the Monthly Pot?',
    a: 'Go to the Compete tab, tap Enter the Pot for $1. Entries close on the 15th of each month.',
  },
  {
    q: 'How does voting work?',
    a: 'All paid competitors get one anonymous vote. You must vote before the draw closes to stay eligible. You cannot vote for yourself.',
  },
  {
    q: 'What happens if nobody wins?',
    a: 'If fewer than 100 qualified competitors finish the month, the pot rolls over to next month and keeps growing.',
  },
  {
    q: 'How do I reset my password?',
    a: 'Go to the login page and tap Forgot password. You can reset via email or phone number.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Go to Profile → Settings → Delete Account.',
  },
  {
    q: 'How do I contact support?',
    a: 'Email us at support@strove.app',
  },
];

export default function Support() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter(
      (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
    );
  }, [query]);

  function openMail() {
    const subject = encodeURIComponent('Strove Support Request');
    window.location.href = `mailto:support@strove.app?subject=${subject}`;
  }

  return (
    <div className="min-h-dvh bg-black text-white font-sans px-5 py-6 md:py-10">
      <div className="w-full max-w-[640px] mx-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-[13px] text-zinc-400 hover:text-orange hover:underline mb-5"
        >
          <ChevronLeft size={14} /> Back
        </button>

        <h1 className="text-[26px] font-bold tracking-tight">Help &amp; Support</h1>
        <p className="mt-1.5 text-[14px] text-zinc-500">
          Find answers fast or reach out to us directly.
        </p>

        <div className="relative mt-6">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for help..."
            className="w-full h-12 pl-10 pr-3.5 rounded-[8px] bg-[#111] border border-[#222] text-white text-[15px] placeholder:text-zinc-500 outline-none transition-colors focus:border-orange"
          />
        </div>

        <h2 className="mt-8 text-[12px] uppercase tracking-wider font-bold text-zinc-500">
          Frequently Asked
        </h2>

        <ul className="mt-3 flex flex-col gap-2">
          {filtered.length === 0 ? (
            <li className="text-sm text-zinc-500 py-6 text-center">
              No matches. Try different keywords or email support directly.
            </li>
          ) : (
            filtered.map((item, i) => {
              const id = item.q;
              const open = openId === id;
              return (
                <li
                  key={id}
                  className="rounded-[8px] bg-[#0a0a0a] border border-[#222] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : id)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-[#111] transition-colors"
                    aria-expanded={open}
                  >
                    <span className="text-[14px] font-medium text-white">{item.q}</span>
                    <ChevronDown
                      size={16}
                      className={
                        'text-zinc-500 shrink-0 transition-transform ' +
                        (open ? 'rotate-180' : '')
                      }
                    />
                  </button>
                  {open ? (
                    <div className="px-4 pb-4 text-[14px] leading-relaxed text-zinc-400 border-t border-[#1a1a1a] pt-3">
                      {item.a}
                    </div>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>

        <div className="mt-8">
          <button
            type="button"
            onClick={openMail}
            className="w-full h-12 rounded-[8px] bg-orange text-black text-[15px] font-semibold inline-flex items-center justify-center gap-2 hover:brightness-110 transition active:scale-[0.99]"
          >
            <Mail size={16} /> Contact Support
          </button>
          <p className="mt-3 text-[12px] text-zinc-500 text-center">
            We reply within 24 hours, usually faster.
          </p>
        </div>
      </div>
    </div>
  );
}
