import { cn } from '../../lib/cn';

const SIZES = {
  xs: 'h-8 w-8 text-xs',
  sm: 'h-9 w-9 text-sm',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-20 w-20 text-2xl',
  '2xl': 'h-28 w-28 text-4xl',
};

export function Avatar({ src, name = '?', size = 'md', className, gradient = false }) {
  const initial = (name || '?')[0].toUpperCase();
  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden grid place-items-center font-bold border border-border shrink-0',
        gradient ? 'bg-orange-grad text-black' : 'bg-card text-orange-400',
        SIZES[size] || SIZES.md,
        className
      )}
    >
      {src ? (
        <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
