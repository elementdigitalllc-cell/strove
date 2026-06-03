import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import BrandLogo from '../components/BrandLogo';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const result = await login(email.trim(), password);
    setBusy(false);
    if (!result.ok) setError(result.error || 'Sign-in failed.');
  }

  return (
    <div className="relative min-h-dvh grid place-items-center px-4 py-6 bg-bg">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-[100px] bg-orange/25" />
        <div className="absolute -bottom-32 -right-24 w-[420px] h-[420px] rounded-full blur-[100px] bg-amber/15" />
      </div>
      <Link to="/" className="absolute top-5 left-5 text-sm text-muted hover:text-orange">← Back</Link>

      <div className="relative w-full max-w-[380px] bg-card border border-border rounded-3xl p-6 md:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col items-center gap-2 mb-6">
          <BrandLogo size={56} />
          <h1 className="text-2xl font-extrabold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted">Log in to keep your streak alive.</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <Field label="Email">
            <Input
              type="email"
              autoCapitalize="off"
              autoCorrect="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {error ? <ErrorBox>{error}</ErrorBox> : null}

          <Button type="submit" full disabled={busy}>
            {busy ? 'Logging in…' : 'Log in'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          New here?{' '}
          <Link to="/signup" className="text-orange font-semibold">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
}

export function ErrorBox({ children }) {
  return (
    <div className="text-[13px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3.5 py-2.5">
      {children}
    </div>
  );
}
