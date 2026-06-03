import { cn } from '../../lib/cn';

export function Spinner({ size = 24, className }) {
  return (
    <div
      className={cn('inline-block animate-spin rounded-full border-2 border-border border-t-orange', className)}
      style={{ width: size, height: size }}
    />
  );
}

export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Spinner />
      <div className="text-sm text-muted font-normal">{label}</div>
    </div>
  );
}

export function ErrorBlock({ error, onRetry }) {
  const msg = typeof error === 'string' ? error : error?.message || 'Something went wrong.';
  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200 flex flex-col gap-2">
      <div className="font-semibold">Couldn't load.</div>
      <div className="text-rose-300/80 font-normal">{msg}</div>
      {onRetry ? (
        <button onClick={onRetry} className="self-start text-rose-200 text-xs font-semibold underline">Try again</button>
      ) : null}
    </div>
  );
}

export function Toast({ tone = 'error', children }) {
  const map = {
    error: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  };
  return (
    <div className={cn('text-[13px] border rounded-xl px-3.5 py-2.5', map[tone])}>
      {children}
    </div>
  );
}
