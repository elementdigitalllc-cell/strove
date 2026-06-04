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
    <span
      className={cn(
        'inline-flex items-center gap-0.5 px-1 py-px rounded leading-none bg-orange text-black font-semibold',
        size === 'lg' ? 'text-[6.5px] px-1.5 py-0.5' : 'text-[5.5px]',
        className
      )}
    >
      <span>🔥</span>
      <span className="font-bold">{count || 0}</span>
    </span>
  );
}
