import { cva } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const button = cva(
  'inline-flex items-center justify-center gap-2 font-semibold rounded transition disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-orange text-black hover:brightness-110',
        ghost: 'bg-transparent text-orange border border-orange/40 hover:bg-orange/10',
        outline: 'bg-transparent text-fg border border-border hover:border-muted',
        muted: 'bg-card text-fg border border-border hover:border-muted/60',
        dark: 'bg-transparent text-fg border border-[#2a2a2a] hover:border-muted',
        link: 'text-orange hover:underline px-0 h-auto',
      },
      size: {
        sm: 'h-8 px-4 text-xs',
        md: 'h-10 px-5 text-sm',
        lg: 'h-12 px-7 text-[15px]',
        icon: 'h-10 w-10 p-0',
      },
      full: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export function Button({ className, variant, size, full, asChild, type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={cn(button({ variant, size, full }), className)}
      {...props}
    />
  );
}
