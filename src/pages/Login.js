import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import BackArrow from '../components/BackArrow';

export default function Login() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const result = await login(identifier.trim(), password);
    setBusy(false);
    if (!result.ok) setError(result.error || 'Sign-in failed.');
  }

  return (
    <div className="relative min-h-dvh grid place-items-center px-5 py-10 bg-black font-sans text-white">
      <BackArrow />
      <div className="w-full max-w-[360px] flex flex-col items-center">
        <img
          src={process.env.PUBLIC_URL + '/logo.png'}
          alt="Strove"
          className="w-14 h-14 mb-5"
          style={{ mixBlendMode: 'screen' }}
        />
        <h1 className="text-[24px] font-bold tracking-tight text-white text-center">Welcome back</h1>
        <p className="mt-1.5 text-sm text-zinc-500 text-center">Log in to keep your streak alive.</p>

        <form onSubmit={submit} className="w-full mt-7 flex flex-col gap-3">
          <AuthInput
            type="text"
            autoCapitalize="off"
            autoCorrect="off"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Username, email, or phone number"
          />
          <AuthInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />

          {error ? <AuthError>{error}</AuthError> : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 w-full h-11 rounded-[6px] bg-orange text-black text-[15px] font-semibold transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-5 text-sm text-zinc-500 text-center">
          New here?{' '}
          <Link to="/signup" className="text-orange font-medium hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

export function AuthInput({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={
        'w-full h-11 px-3.5 rounded-[6px] bg-[#111] border border-[#222] text-white text-[15px] placeholder:text-zinc-500 outline-none transition-colors focus:border-[#333] ' +
        className
      }
    />
  );
}

export function AuthError({ children }) {
  return (
    <div className="text-[13px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-[6px] px-3 py-2">
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

export function ErrorBox({ children }) {
  return <AuthError>{children}</AuthError>;
}
