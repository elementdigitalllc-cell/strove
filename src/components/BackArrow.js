import { Link } from 'react-router-dom';

export default function BackArrow({ to = '/' }) {
  return (
    <Link
      to={to}
      aria-label="Back"
      className="absolute top-5 left-5 z-20 w-9 h-9 grid place-items-center text-white opacity-80 hover:opacity-100 transition-opacity"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
    </Link>
  );
}
