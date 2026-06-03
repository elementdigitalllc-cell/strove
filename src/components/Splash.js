import BrandLogo from './BrandLogo';
import { Spinner } from './ui/States';

export default function Splash({ label = 'Loading…' }) {
  return (
    <div className="min-h-dvh grid place-items-center bg-bg px-4">
      <div className="flex flex-col items-center gap-4">
        <BrandLogo size={56} />
        <Spinner size={22} />
        <div className="text-sm text-muted font-normal">{label}</div>
      </div>
    </div>
  );
}
