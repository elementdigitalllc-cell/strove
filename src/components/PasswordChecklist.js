import { Check, X } from 'lucide-react';

export default function PasswordChecklist({ checks, show }) {
  if (!show) return null;
  return (
    <ul className="mt-2 space-y-1">
      {checks.map((c) => (
        <li key={c.id} className="flex items-center gap-2 text-[12px]">
          {c.met ? (
            <Check size={14} className="text-emerald-400 shrink-0" strokeWidth={3} />
          ) : (
            <X size={14} className="text-zinc-500 shrink-0" strokeWidth={2.5} />
          )}
          <span className={c.met ? 'text-emerald-400' : 'text-zinc-500'}>{c.label}</span>
        </li>
      ))}
    </ul>
  );
}
