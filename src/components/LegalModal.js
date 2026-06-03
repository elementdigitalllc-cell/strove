import { useEffect } from 'react';
import { X } from 'lucide-react';
import {
  PRIVACY_BODY,
  PRIVACY_TITLE,
  TERMS_BODY,
  TERMS_TITLE,
} from './LegalContent';

export default function LegalModal({ kind, title, body, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  let resolvedTitle = title;
  let resolvedBody = body;
  if (kind === 'terms') {
    resolvedTitle = TERMS_TITLE;
    resolvedBody = TERMS_BODY;
  } else if (kind === 'privacy') {
    resolvedTitle = PRIVACY_TITLE;
    resolvedBody = PRIVACY_BODY;
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm grid place-items-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[560px] max-h-[80vh] overflow-y-auto bg-[#0a0a0a] border border-[#27272a] rounded p-6 sm:p-7">
        <header className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-[22px] font-extrabold tracking-tight text-white">{resolvedTitle}</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded text-[#71717a] hover:text-white hover:bg-white/5"
            aria-label="Close"
            type="button"
          >
            <X size={18} />
          </button>
        </header>
        <div className="text-[14.5px] leading-relaxed text-[#a1a1aa] font-normal space-y-4">
          {resolvedBody}
        </div>
      </div>
    </div>
  );
}
