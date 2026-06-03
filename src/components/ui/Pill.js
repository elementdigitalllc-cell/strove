import { cn } from '../../lib/cn';

export function Pill({ className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold leading-none',
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
        'bg-orange text-black',
        size === 'lg' && 'text-[13px] px-2.5 py-1',
        className
      )}
    >
      <span>🔥</span>
      <span className="font-bold">{count || 0}</span>
    </Pill>
  );
}
