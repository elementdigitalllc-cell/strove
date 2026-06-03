import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../supabaseClient';
import LegalModal from '../components/LegalModal';
import BackArrow from '../components/BackArrow';

const PASSWORD_RULES = [
  { id: 'len', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'num', label: 'One number', test: (p) => /\d/.test(p) },
  { id: 'special', label: 'One special character (!@#$%^&…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function evaluatePassword(p) {
  return PASSWORD_RULES.map((r) => ({ ...r, met: r.test(p) }));
}

export default function Signup() {
  const { signup, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    contact: '',
    password: '',
    fullName: '',
    username: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [legalModal, setLegalModal] = useState(null);
  const [usernameError, setUsernameError] = useState('');

  // OTP state
  const [otp, setOtp] = useState(null); // { channel, identifier } | null
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [resendNote, setResendNote] = useState('');

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const passwordChecks = useMemo(() => evaluatePassword(form.password), [form.password]);
  const passwordValid = passwordChecks.every((c) => c.met);

  async function checkUsernameAvailable(name) {
    const trimmed = (name || '').trim().toLowerCase();
    if (!trimmed) {
      setUsernameError('');
      return true;
    }
    const { data, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', trimmed)
      .maybeSingle();
    if (lookupError) {
      // Don't block on lookup failure; server-side unique constraint will catch it.
      setUsernameError('');
      return true;
    }
    if (data) {
      setUsernameError('This username is already taken. Please choose another.');
      return false;
    }
    setUsernameError('');
    return true;
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!passwordValid) {
      return setError('Password does not meet the requirements below.');
    }
    const usernameOk = await checkUsernameAvailable(form.username);
    if (!usernameOk) return;
    setBusy(true);
    const result = await signup({
      fullName: form.fullName,
      contact: form.contact,
      username: form.username,
      password: form.password,
    });
    setBusy(false);
    console.log('[Signup.submit] signup result =', result);
    if (!result.ok) return setError(result.error);
    if (result.verified) {
      navigate('/feed');
      return;
    }
    console.log('[Signup.submit] setOtp ->', { channel: result.channel, identifier: result.identifier });
    setOtp({ channel: result.channel, identifier: result.identifier });
    setResendIn(60);
  }

  async function submitOtp(e) {
    e.preventDefault();
    if (!otp) return;
    setOtpError('');
    setOtpBusy(true);
    const result = await verifyOtp({
      channel: otp.channel,
      identifier: otp.identifier,
      token: otpCode,
    });
    setOtpBusy(false);
    if (!result.ok) return setOtpError(result.error);
    navigate('/feed');
  }

  async function resend() {
    if (!otp || resendIn > 0) return;
    setOtpError('');
    setResendNote('');
    const result = await resendOtp({ channel: otp.channel, identifier: otp.identifier });
    if (!result.ok) {
      setOtpError(result.error);
      return;
    }
    setResendNote('New code sent.');
    setResendIn(60);
  }

  if (otp) {
    return (
      <OtpScreen
        channel={otp.channel}
        identifier={otp.identifier}
        code={otpCode}
        setCode={setOtpCode}
        error={otpError}
        busy={otpBusy}
        resendIn={resendIn}
        setResendIn={setResendIn}
        resendNote={resendNote}
        onSubmit={submitOtp}
        onResend={resend}
        onChangeContact={() => {
          setOtp(null);
          setOtpCode('');
          setOtpError('');
          setResendNote('');
        }}
      />
    );
  }

  return (
    <div className="relative min-h-dvh bg-black text-white font-sans px-6 py-12 flex justify-center">
      <BackArrow />
      <div className="w-full max-w-[400px]">
        <img
          src={process.env.PUBLIC_URL + '/logo.png'}
          alt="Strove"
          className="w-12 h-12 mb-7"
          style={{ mixBlendMode: 'screen' }}
        />

        <h1 className="text-[26px] font-bold tracking-tight text-white leading-tight">
          Create your account
        </h1>
        <p className="mt-2 text-[14px] text-zinc-500">
          Join thousands of people building better habits.
        </p>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
          <LabeledField label="Mobile Number or Email Address">
            <SignupInput
              type="text"
              autoCapitalize="off"
              autoCorrect="off"
              value={form.contact}
              onChange={(e) => update('contact', e.target.value)}
            />
          </LabeledField>

          <LabeledField label="Password">
            <SignupInput
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
            />
            <PasswordChecklist checks={passwordChecks} show={form.password.length > 0} />
          </LabeledField>

          <LabeledField label="Full name">
            <SignupInput
              type="text"
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
            />
          </LabeledField>

          <LabeledField label="Username">
            <SignupInput
              type="text"
              autoCapitalize="off"
              autoCorrect="off"
              value={form.username}
              onChange={(e) => {
                update('username', e.target.value);
                if (usernameError) setUsernameError('');
              }}
              onBlur={(e) => checkUsernameAvailable(e.target.value)}
            />
            {usernameError ? (
              <p className="mt-2 text-[13px] text-rose-400">{usernameError}</p>
            ) : null}
          </LabeledField>

          <p className="text-[12px] leading-relaxed text-zinc-500 mt-1">
            By creating an account you agree to our{' '}
            <button
              type="button"
              onClick={() => setLegalModal('terms')}
              className="text-orange hover:underline font-medium"
            >
              Terms
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={() => setLegalModal('privacy')}
              className="text-orange hover:underline font-medium"
            >
              Privacy Policy
            </button>
            .
          </p>

          {error ? (
            <div className="text-[13px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-[8px] px-3 py-2">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy || !passwordValid || !!usernameError}
            className="mt-2 w-full h-12 rounded-[8px] bg-orange text-black text-[15px] font-semibold transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Creating account…' : 'Create account'}
          </button>

          <p className="mt-3 text-[14px] text-zinc-500 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-orange font-medium hover:underline">Log in</Link>
          </p>
        </form>
      </div>

      {legalModal ? (
        <LegalModal kind={legalModal} onClose={() => setLegalModal(null)} />
      ) : null}
    </div>
  );
}

function OtpScreen({
  channel,
  identifier,
  code,
  setCode,
  error,
  busy,
  resendIn,
  setResendIn,
  resendNote,
  onSubmit,
  onResend,
  onChangeContact,
}) {
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn, setResendIn]);

  const codeLength = channel === 'phone' ? 6 : 8;
  console.log('[OtpScreen] channel =', channel, '| codeLength =', codeLength, '| identifier =', identifier);
  const title = channel === 'phone' ? 'Check your phone' : 'Check your email';
  const subtitle =
    channel === 'phone'
      ? 'We sent a 6-digit code to your phone number. Enter it below.'
      : `We sent a code to ${identifier}. Enter it below to complete your signup.`;
  const changeLabel = channel === 'phone' ? 'Wrong number? Go back' : 'Wrong email? Go back';

  return (
    <div className="relative min-h-dvh bg-black text-white font-sans px-6 py-12 flex justify-center">
      <BackArrow />
      <div className="w-full max-w-[400px]">
        <img
          src={process.env.PUBLIC_URL + '/logo.png'}
          alt="Strove"
          className="w-12 h-12 mb-7"
          style={{ mixBlendMode: 'screen' }}
        />

        <h1 className="text-[26px] font-bold tracking-tight text-white leading-tight">{title}</h1>
        <p className="mt-2 text-[14px] text-zinc-500">{subtitle}</p>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
          <OtpBoxes code={code} setCode={setCode} hasError={!!error} length={codeLength} />

          {error ? (
            <p className="text-[13px] text-rose-400 -mt-1">{error}</p>
          ) : null}

          {resendNote && !error ? (
            <p className="text-[13px] text-emerald-400 -mt-1">{resendNote}</p>
          ) : null}

          <button
            type="submit"
            disabled={busy || code.length !== codeLength}
            className="mt-1 w-full h-12 rounded-[8px] bg-orange text-black text-[15px] font-semibold transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Verifying…' : 'Verify'}
          </button>

          <p className="text-[14px] text-zinc-500 text-center">
            {resendIn > 0 ? (
              <span>Resend in {resendIn}s</span>
            ) : (
              <button
                type="button"
                onClick={onResend}
                className="text-zinc-400 hover:text-orange hover:underline"
              >
                Resend code
              </button>
            )}
          </p>

          <p className="text-[13px] text-zinc-500 text-center -mt-2">
            <button
              type="button"
              onClick={onChangeContact}
              className="hover:text-orange hover:underline"
            >
              {changeLabel}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

function OtpBoxes({ code, setCode, hasError, length = 8 }) {
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

function PasswordChecklist({ checks, show }) {
  if (!show) return null;
  return (
    <ul className="mt-2 space-y-1">
      {checks.map((c) => (
        <li key={c.id} className="flex items-center gap-2 text-[12px]">
          {c.met ? (
            <Check size={14} className="text-emerald-400 shrink-0" strokeWidth={3} />
          ) : (
            <X size={14} className="text-zinc-500 shrink-0" strokeWidth={2.5} />
          )}
          <span className={c.met ? 'text-emerald-400' : 'text-zinc-500'}>{c.label}</span>
        </li>
      ))}
    </ul>
  );
}

function LabeledField({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-white">{label}</span>
      {children}
    </label>
  );
}

function SignupInput(props) {
  return (
    <input
      {...props}
      className="w-full h-12 px-3.5 rounded-[8px] bg-[#111] border border-[#333] text-white text-[15px] outline-none transition-colors focus:border-orange"
    />
  );
}
