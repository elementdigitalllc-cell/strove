import { createContext, useContext } from 'react';
import { cn } from '../../lib/cn';

const TabsCtx = createContext(null);

export function Tabs({ value, onValueChange, className, children }) {
  return (
    <TabsCtx.Provider value={{ value, onValueChange }}>
      <div className={cn(className)}>{children}</div>
    </TabsCtx.Provider>
  );
}

export function TabsList({ className, variant = 'underline', children }) {
  return (
    <div
      className={cn(
        variant === 'pill'
          ? 'inline-flex p-1 bg-card border border-border rounded gap-1'
          : 'flex border-b border-border',
        className
      )}
      data-variant={variant}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({ value, className, children }) {
  const ctx = useContext(TabsCtx);
  const active = ctx?.value === value;
  return (
    <button
      type="button"
      onClick={() => ctx?.onValueChange(value)}
      className={cn(
        'relative px-4 py-2.5 text-sm font-medium transition-colors',
        active ? 'text-fg' : 'text-muted hover:text-fg',
        className
      )}
    >
      {children}
      {active ? (
        <span className="absolute left-1/2 -translate-x-1/2 -bottom-px h-0.5 w-8 bg-orange" />
      ) : null}
    </button>
  );
}

export function TabsPill({ value, className, children }) {
  const ctx = useContext(TabsCtx);
  const active = ctx?.value === value;
  return (
    <button
      type="button"
      onClick={() => ctx?.onValueChange(value)}
      className={cn(
        'flex-1 px-4 h-9 text-sm font-semibold rounded transition-colors',
        active ? 'bg-orange text-black' : 'text-muted hover:text-fg',
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children }) {
  const ctx = useContext(TabsCtx);
  if (ctx?.value !== value) return null;
  return <div className={cn('mt-4', className)}>{children}</div>;
}
