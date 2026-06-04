import BrandLogo from './BrandLogo';
import { cn } from '../lib/cn';

export function StroveBadge({ className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 px-1 py-px rounded leading-none',
        'text-[5.5px] font-bold uppercase tracking-wider',
        'text-orange-300 border border-orange/60 bg-orange/10',
        'shadow-[0_0_6px_-1px_rgba(249,115,22,0.45)]',
        className
      )}
      aria-label="Strove badge"
    >
      <BrandLogo size={8} className="!drop-shadow-none" />
      <span>Strove</span>
    </span>
  );
}

const REGISTRY = {
  strove: StroveBadge,
};

export function BadgeStrip({ badges, className }) {
  if (!Array.isArray(badges) || badges.length === 0) return null;
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {badges.map((id) => {
        const Cmp = REGISTRY[id];
        return Cmp ? <Cmp key={id} /> : null;
      })}
    </span>
  );
}
