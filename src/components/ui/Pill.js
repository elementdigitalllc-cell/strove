import { cn } from '../../lib/cn';

export function Pill({ className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold leading-none',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function StreakPill({ count, size = 'sm', className }) {
  return (
    <Pill
      className={cn(
        'bg-orange-grad text-black shadow-[0_2px_6px_-2px_rgba(249,115,22,0.5)]',
        size === 'lg' && 'text-[13px] px-3 py-1',
        className
      )}
    >
      <span>🔥</span>
      <span className="font-bold">{count || 0}</span>
    </Pill>
  );
}
