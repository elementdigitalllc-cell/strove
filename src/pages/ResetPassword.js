import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { evaluatePassword } from '../lib/password';
import BackArrow from '../components/BackArrow';
import PasswordChecklist from '../components/PasswordChecklist';

function parseHashParams(hash) {
  const out = {};
  const raw = (hash || '').replace(/^#/, '');
  if (!raw) return out;
  for (const pair of raw.split('&')) {
    const [k, v] = pair.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || '');
  }
  return out;
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const checks = useMemo(() => evaluatePassword(pw), [pw]);
  const passwordValid = checks.every((c) => c.met);
  const match = pw && pw === confirm;

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const params = parseHashParams(window.location.hash);
      console.log('[ResetPassword] hash params =', params);

      if (params.type !== 'recovery' || !params.access_token) {
        console.warn('[ResetPassword] no recovery token -> redirecting to /login');
        navigate('/login', { replace: true });
        return;
      }

      const { error: setError } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token || '',
      });
      if (cancelled) return;
      if (setError) {
        console.error('[ResetPassword] setSession failed:', setError);
        navigate('/login', { replace: true });
        return;
      }

      // Clean the hash so a refresh doesn't re-trigger the flow.
      window.history.replaceState(null, '', window.location.pathname);
      setReady(true);
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!passwordValid) return setError('Password does not meet the requirements below.');
    if (!match) return setError('Passwords do not match.');
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (updateError) return setError(updateError.message);
    setSuccess('Password updated successfully!');
    setTimeout(() => navigate('/home'), 2000);
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

        {!ready ? (
          <p className="text-sm text-zinc-500">Verifying recovery link…</p>
        ) : (
          <>
            <h1 className="text-[22px] font-bold tracking-tight text-white text-center">
              Set a new password
            </h1>
            <p className="mt-2 text-sm text-zinc-500 text-center">
              Pick a strong password to finish resetting your account.
            </p>
            <form onSubmit={submit} className="w-full mt-6 flex flex-col gap-3">
              <ResetInput
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="New password"
              />
              <PasswordChecklist checks={checks} show={pw.length > 0} />
              <ResetInput
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
              />
              {confirm && !match ? (
                <p className="text-[12px] text-rose-400">Passwords do not match.</p>
              ) : null}
              {error ? (
                <div className="text-[13px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-[6px] px-3 py-2">
                  {error}
                </div>
              ) : null}
              {success ? (
                <div className="text-[13px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-[6px] px-3 py-2">
                  {success}
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
        )}
      </div>
    </div>
  );
}

function ResetInput({ className = '', ...props }) {
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
