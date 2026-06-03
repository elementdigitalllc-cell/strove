import { useEffect, useRef } from 'react';

export default function OtpBoxes({ code, setCode, hasError, length = 8 }) {
  const refs = useRef([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  function setDigit(i, val) {
    const digit = val.replace(/\D/g, '').slice(-1);
    const arr = code.padEnd(length, ' ').split('');
    arr[i] = digit || ' ';
    setCode(arr.join('').replace(/\s/g, ''));
    if (digit && i < length - 1) refs.current[i + 1]?.focus();
  }

  function onKeyDown(i, e) {
    if (e.key === 'Backspace') {
      if (code[i]) {
        const arr = code.padEnd(length, ' ').split('');
        arr[i] = ' ';
        setCode(arr.join('').replace(/\s/g, ''));
      } else if (i > 0) {
        e.preventDefault();
        const arr = code.padEnd(length, ' ').split('');
        arr[i - 1] = ' ';
        setCode(arr.join('').replace(/\s/g, ''));
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      refs.current[i + 1]?.focus();
    }
  }

  function onPaste(e) {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, length);
    if (!text) return;
    e.preventDefault();
    setCode(text);
    const next = Math.min(text.length, length - 1);
    refs.current[next]?.focus();
  }

  return (
    <div className="flex gap-1.5 justify-between">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={code[i] || ''}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={i === 0 ? onPaste : undefined}
          className={
            'flex-1 min-w-0 h-14 text-center text-[20px] font-semibold rounded-[8px] bg-[#111] border text-white outline-none transition-colors focus:border-orange ' +
            (hasError ? 'border-rose-500/60' : 'border-[#333]')
          }
        />
      ))}
    </div>
  );
}
