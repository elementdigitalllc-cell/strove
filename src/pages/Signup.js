import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import LegalModal from '../components/LegalModal';
import BackArrow from '../components/BackArrow';

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

  // OTP state
  const [otp, setOtp] = useState(null); // { channel, identifier } | null
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [resendNote, setResendNote] = useState('');

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const result = await signup({
      fullName: form.fullName,
      contact: form.contact,
      username: form.username,
      password: form.password,
    });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    if (result.verified) {
      navigate('/feed');
      return;
    }
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
          <LabeledField label="Mobile number or email address">
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
              onChange={(e) => update('username', e.target.value)}
            />
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
            disabled={busy}
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

  const title = channel === 'phone' ? 'Check your phone' : 'Check your email';
  const subtitle =
    channel === 'phone'
      ? `We sent a 6-digit code by SMS to ${identifier}. Enter it below to complete your signup.`
      : `We sent a 6-digit code to ${identifier}. Enter it below to complete your signup.`;
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
          <OtpBoxes code={code} setCode={setCode} hasError={!!error} length={8} />

          {error ? (
            <p className="text-[13px] text-rose-400 -mt-1">{error}</p>
          ) : null}

          {resendNote && !error ? (
            <p className="text-[13px] text-emerald-400 -mt-1">{resendNote}</p>
          ) : null}

          <button
            type="submit"
            disabled={busy || code.length !== 8}
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
