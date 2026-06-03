import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full h-11 px-4 rounded bg-card border border-border text-fg text-[15px] font-medium placeholder:text-muted/70 outline-none transition-colors focus:border-orange',
        className
      )}
      {...props}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full px-4 py-3 rounded bg-card border border-border text-fg text-[15px] leading-relaxed placeholder:text-muted/70 outline-none transition-colors focus:border-orange resize-y',
        className
      )}
      {...props}
    />
  );
});
