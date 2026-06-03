import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import BrandLogo from '../components/BrandLogo';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Field, ErrorBox } from './Login';

export default function Signup() {
  const { signup } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const result = await signup(form);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    if (!result.confirmed) setNeedsConfirmation(true);
  }

  return (
    <div className="relative min-h-dvh grid place-items-center px-4 py-6 bg-bg">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-[100px] bg-orange/25" />
        <div className="absolute -bottom-32 -right-24 w-[420px] h-[420px] rounded-full blur-[100px] bg-amber/15" />
      </div>
      <Link to="/" className="absolute top-5 left-5 text-sm text-muted hover:text-orange">← Back</Link>

      <div className="relative w-full max-w-[440px] bg-card border border-border rounded p-6 md:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col items-center gap-2 mb-5">
          <BrandLogo size={56} />
          <h1 className="text-2xl font-extrabold tracking-tight text-center">
            {needsConfirmation ? 'Check your email' : 'Create your account'}
          </h1>
          <p className="text-sm text-muted text-center">
            {needsConfirmation
              ? 'We sent a confirmation link to ' + form.email + '. Click it to finish signing up.'
              : "A few details and you're in."}
          </p>
        </div>

        {needsConfirmation ? (
          <div className="flex flex-col gap-3.5">
            <div className="text-[13px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-3.5 py-2.5">
              Account created. After confirming via email, log in here.
            </div>
            <Link to="/login"><Button full>Go to log in</Button></Link>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3.5">
            <Field label="Full name">
              <Input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="Alex Rivera" />
            </Field>
            <Field label="Email">
              <Input type="email" autoCapitalize="off" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@email.com" />
            </Field>
            <Field label="Phone number (optional)">
              <Input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+1 555 123 4567" />
            </Field>
            <Field label="Username">
              <Input autoCapitalize="off" autoCorrect="off" value={form.username} onChange={(e) => update('username', e.target.value)} placeholder="yourname" />
            </Field>
            <Field label="Password">
              <Input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="At least 6 characters" />
            </Field>

            {error ? <ErrorBox>{error}</ErrorBox> : null}

            <Button type="submit" full disabled={busy}>
              {busy ? 'Creating account…' : 'Create account'}
            </Button>

            <p className="text-center text-sm text-muted">
              Already have an account? <Link to="/login" className="text-orange font-semibold">Log in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
