import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../supabaseClient';
import { evaluatePassword } from '../lib/password';
import BackArrow from '../components/BackArrow';
import OtpBoxes from '../components/OtpBoxes';
import PasswordChecklist from '../components/PasswordChecklist';

function normalizePhoneLocal(raw) {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return '+' + digits;
}

function detectContactKindLocal(c) {
  const s = (c || '').trim();
  if (!s) return null;
  if (s.includes('@')) return 'email';
  if (/^\+?[\d\s\-().]{7,}$/.test(s)) return 'phone';
  return null;
}

export default function Login() {
  const { login } = useAuth();
  const [view, setView] = useState('login');
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

  if (view !== 'login') {
    return (
      <ForgotFlow
        initialView={view}
        onBackToLogin={() => {
          setView('login');
          setError('');
        }}
      />
    );
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

        <button
          type="button"
          onClick={() => setView('forgotMenu')}
          className="mt-4 text-[13px] text-zinc-400 hover:text-orange hover:underline"
        >
          Forgot password or username?
        </button>

        <p className="mt-4 text-sm text-zinc-500 text-center">
          New here?{' '}
          <Link to="/signup" className="text-orange font-medium hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

function ForgotFlow({ initialView, onBackToLogin }) {
  const [view, setView] = useState(initialView);
  const [phoneForReset, setPhoneForReset] = useState('');

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

        {view === 'forgotMenu' ? (
          <ForgotMenu onChangeView={setView} />
        ) : view === 'forgotPassword' ? (
          <ForgotPassword
            onBack={() => setView('forgotMenu')}
            onPhoneOtpSent={(phone) => {
              setPhoneForReset(phone);
              setView('forgotPasswordOtp');
            }}
          />
        ) : view === 'forgotPasswordOtp' ? (
          <ForgotPasswordOtp
            phone={phoneForReset}
            onBack={() => setView('forgotPassword')}
            onVerified={() => setView('forgotPasswordSetNew')}
          />
        ) : view === 'forgotPasswordSetNew' ? (
          <SetNewPassword />
        ) : (
          <ForgotUsername onBack={() => setView('forgotMenu')} />
        )}

        {view !== 'forgotPasswordSetNew' ? (
          <button
            type="button"
            onClick={onBackToLogin}
            className="mt-6 text-[13px] text-zinc-500 hover:text-orange hover:underline"
          >
            Back to log in
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ForgotMenu({ onChangeView }) {
  return (
    <>
      <h1 className="text-[24px] font-bold tracking-tight text-white text-center">Trouble logging in?</h1>
      <p className="mt-1.5 text-sm text-zinc-500 text-center">Pick what you need to recover.</p>
      <div className="w-full mt-7 flex flex-col gap-3">
        <MenuButton onClick={() => onChangeView('forgotPassword')}>Forgot password</MenuButton>
        <MenuButton onClick={() => onChangeView('forgotUsername')}>Forgot username</MenuButton>
      </div>
    </>
  );
}

function MenuButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full h-12 rounded-[6px] bg-[#111] border border-[#222] text-white text-[15px] font-medium hover:border-orange transition-colors text-left px-4"
    >
      {children}
    </button>
  );
}

function StepHeader({ title, subtitle, onBack }) {
  return (
    <div className="w-full">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-[13px] text-zinc-400 hover:text-orange hover:underline mb-3"
        >
          <ChevronLeft size={14} /> Back
        </button>
      ) : null}
      <h1 className="text-[22px] font-bold tracking-tight text-white">{title}</h1>
      <p className="mt-1.5 text-sm text-zinc-500">{subtitle}</p>
    </div>
  );
}

function ForgotPassword({ onBack, onPhoneOtpSent }) {
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const trimmed = contact.trim();
    const kind = detectContactKindLocal(trimmed);
    if (!kind) {
      setError('Enter a valid email or phone number.');
      return;
    }
    setBusy(true);
    if (kind === 'email') {
      const { error: rpcError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: window.location.origin + '/login',
      });
      setBusy(false);
      if (rpcError) return setError(rpcError.message);
      setSuccess('Check your email for a password reset link.');
      return;
    }
    // phone
    const phone = normalizePhoneLocal(trimmed);
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);
    if (otpError) return setError(otpError.message);
    onPhoneOtpSent(phone);
  }

  return (
    <>
      <StepHeader
        title="Reset your password"
        subtitle="Enter the email or phone on your account and we'll send a reset code."
        onBack={onBack}
      />
      <form onSubmit={submit} className="w-full mt-6 flex flex-col gap-3">
        <AuthInput
          type="text"
          autoCapitalize="off"
          autoCorrect="off"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Email or phone number"
        />
        {error ? <AuthError>{error}</AuthError> : null}
        {success ? (
          <div className="text-[13px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-[6px] px-3 py-2">
            {success}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-1 w-full h-11 rounded-[6px] bg-orange text-black text-[15px] font-semibold transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </>
  );
}

function ForgotPasswordOtp({ phone, onBack, onVerified }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(60);
  const [resendNote, setResendNote] = useState('');

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    });
    setBusy(false);
    if (verifyError) {
      setError('Invalid code. Please try again.');
      return;
    }
    onVerified();
  }

  async function resend() {
    if (resendIn > 0) return;
    setError('');
    setResendNote('');
    const { error: rpcError } = await supabase.auth.signInWithOtp({ phone });
    if (rpcError) return setError(rpcError.message);
    setResendNote('New code sent.');
    setResendIn(60);
  }

  return (
    <>
      <StepHeader
        title="Check your phone"
        subtitle="Enter the code we sent to your phone number to reset your password."
        onBack={onBack}
      />
      <form onSubmit={submit} className="w-full mt-6 flex flex-col gap-4">
        <OtpBoxes code={code} setCode={setCode} hasError={!!error} length={6} />
        {error ? <AuthError>{error}</AuthError> : null}
        {resendNote && !error ? (
          <p className="text-[13px] text-emerald-400">{resendNote}</p>
        ) : null}
        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="mt-1 w-full h-11 rounded-[6px] bg-orange text-black text-[15px] font-semibold transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Verifying…' : 'Verify'}
        </button>
        <p className="text-[13px] text-zinc-500 text-center">
          {resendIn > 0 ? (
            <span>Resend in {resendIn}s</span>
          ) : (
            <button
              type="button"
              onClick={resend}
              className="text-zinc-400 hover:text-orange hover:underline"
            >
              Resend code
            </button>
          )}
        </p>
      </form>
    </>
  );
}

function SetNewPassword() {
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const checks = useMemo(() => evaluatePassword(pw), [pw]);
  const passwordValid = checks.every((c) => c.met);
  const match = pw && pw === confirm;

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!passwordValid) return setError('Password does not meet the requirements below.');
    if (!match) return setError('Passwords do not match.');
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (updateError) return setError(updateError.message);
    setSuccess('Password updated.');
    setTimeout(() => navigate('/home'), 800);
  }

  return (
    <>
      <StepHeader title="Set a new password" subtitle="Pick a strong password to finish resetting." />
      <form onSubmit={submit} className="w-full mt-6 flex flex-col gap-3">
        <AuthInput
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="New password"
        />
        <PasswordChecklist checks={checks} show={pw.length > 0} />
        <AuthInput
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
        />
        {confirm && !match ? (
          <p className="text-[12px] text-rose-400">Passwords do not match.</p>
        ) : null}
        {error ? <AuthError>{error}</AuthError> : null}
        {success ? (
          <div className="text-[13px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-[6px] px-3 py-2">
            {success} Redirecting…
          </div>
        ) : null}
        <button
          type="submit"
          disabled={busy || !passwordValid || !match}
          className="mt-1 w-full h-11 rounded-[6px] bg-orange text-black text-[15px] font-semibold transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </>
  );
}

function ForgotUsername({ onBack }) {
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setUsername('');
    const trimmed = contact.trim();
    const kind = detectContactKindLocal(trimmed);
    if (!kind) {
      setError('Enter a valid email or phone number.');
      return;
    }
    setBusy(true);
    let query = supabase.from('profiles').select('username').limit(1);
    if (kind === 'email') {
      query = query.ilike('email', trimmed);
    } else {
      const phone = normalizePhoneLocal(trimmed);
      const phoneNoPlus = phone.replace(/^\+/, '');
      query = query.or(`phone.eq.${phone},phone.eq.${phoneNoPlus}`);
    }
    const { data, error: rpcError } = await query.maybeSingle();
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    if (!data?.username) {
      setError('No account found for that email or phone number.');
      return;
    }
    setUsername(data.username);
  }

  return (
    <>
      <StepHeader
        title="Find your username"
        subtitle="Enter the email or phone on your account."
        onBack={onBack}
      />
      <form onSubmit={submit} className="w-full mt-6 flex flex-col gap-3">
        <AuthInput
          type="text"
          autoCapitalize="off"
          autoCorrect="off"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Email or phone number"
        />
        {error ? <AuthError>{error}</AuthError> : null}
        {username ? (
          <div className="text-[14px] text-white bg-[#111] border border-[#222] rounded-[6px] px-3 py-3 text-center">
            Your username is{' '}
            <span className="text-orange font-semibold">{username}</span>
          </div>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-1 w-full h-11 rounded-[6px] bg-orange text-black text-[15px] font-semibold transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Looking up…' : 'Find username'}
        </button>
      </form>
    </>
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
