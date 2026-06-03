import { useEffect, useState } from 'react';
import { cn } from '../lib/cn';

let cached = null;

export default function BrandLogo({ size = 28, className }) {
  const [hasFile, setHasFile] = useState(cached);

  useEffect(() => {
    if (cached !== null) return;
    const img = new Image();
    img.onload = () => { cached = true; setHasFile(true); };
    img.onerror = () => { cached = false; setHasFile(false); };
    img.src = process.env.PUBLIC_URL + '/logo.png';
  }, []);

  const style = { width: size, height: size };

  if (hasFile) {
    return (
      <span
        className={cn('inline-grid place-items-center overflow-hidden rounded-[9px] drop-shadow-[0_4px_12px_rgba(249,115,22,0.35)]', className)}
        style={style}
      >
        <img src={process.env.PUBLIC_URL + '/logo.png'} alt="Strove" className="w-full h-full" />
      </span>
    );
  }

  return (
    <span
      className={cn('inline-grid place-items-center drop-shadow-[0_4px_12px_rgba(249,115,22,0.35)]', className)}
      style={style}
      aria-label="Strove"
    >
      <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id="sl-flame" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="55%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id="sl-arrow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff7ed" />
            <stop offset="100%" stopColor="#fde68a" />
          </linearGradient>
        </defs>
        <path
          d="M16 1.5
             C 12 8 8.5 11 8 16
             C 7.4 22 11 27 16 30.5
             C 21 27 24.6 22 24 16
             C 23.5 11 20 8 16 1.5 Z"
          fill="url(#sl-flame)"
        />
        <path
          d="M16 7.5 L21 16 L17.6 16 L17.6 22.5 L14.4 22.5 L14.4 16 L11 16 Z"
          fill="url(#sl-arrow)"
        />
      </svg>
    </span>
  );
}
