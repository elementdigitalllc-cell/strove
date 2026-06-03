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
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn, setResendIn]);

  const title = channel === 'phone' ? 'Check your phone' : 'Check your email';
  const subtitle =
    channel === 'phone'
      ? `We sent a 6-digit code by SMS to ${identifier}.`
      : `We sent a 6-digit code to ${identifier}.`;

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

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
          <LabeledField label="Verification code">
            <input
              ref={inputRef}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full h-12 px-3.5 rounded-[8px] bg-[#111] border border-[#333] text-white text-[18px] tracking-[0.4em] text-center outline-none transition-colors focus:border-orange"
            />
          </LabeledField>

          {error ? (
            <div className="text-[13px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-[8px] px-3 py-2">
              {error}
            </div>
          ) : null}

          {resendNote && !error ? (
            <div className="text-[13px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-[8px] px-3 py-2">
              {resendNote}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="mt-2 w-full h-12 rounded-[8px] bg-orange text-black text-[15px] font-semibold transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Verifying…' : 'Verify and continue'}
          </button>

          <p className="mt-3 text-[14px] text-zinc-500 text-center">
            Didn’t get a code?{' '}
            {resendIn > 0 ? (
              <span className="text-zinc-500">Resend in {resendIn}s</span>
            ) : (
              <button
                type="button"
                onClick={onResend}
                className="text-orange font-medium hover:underline"
              >
                Resend code
              </button>
            )}
          </p>
        </form>
      </div>
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
