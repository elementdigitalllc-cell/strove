import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { getProfile } from './sdb';

const AuthContext = createContext(null);

function fallbackProfileFromSession(session) {
  if (!session?.user) return null;
  const u = session.user;
  const meta = u.user_metadata || {};
  const emailLocal = (u.email || '').split('@')[0] || 'user';
  return {
    id: u.id,
    username: meta.username || emailLocal,
    full_name: meta.full_name || '',
    bio: null,
    goal: null,
    streak_count: 0,
    joined_at: u.created_at || new Date().toISOString(),
    __isFallback: true,
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    let unsub;
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.warn('[auth] getSession error:', error.message);
        if (cancelled) return;

        const initialSession = data?.session || null;
        setSession(initialSession);
        if (initialSession) {
          await loadProfileSafe(initialSession);
        }
      } catch (err) {
        console.error('[auth] init failed:', err);
      } finally {
        if (!cancelled) setReady(true);
      }

      const result = supabase.auth.onAuthStateChange(async (_event, sess) => {
        try {
          setSession(sess || null);
          if (sess) {
            await loadProfileSafe(sess);
          } else {
            setProfile(null);
            setProfileError(null);
          }
        } catch (err) {
          console.error('[auth] onAuthStateChange handler failed:', err);
          // Last-resort fallback so guards do not block render
          if (sess) setProfile(fallbackProfileFromSession(sess));
        }
      });
      unsub = result.data.subscription;
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfileSafe(sess, { retry = 0 } = {}) {
    const userId = sess?.user?.id;
    if (!userId) return null;
    try {
      const { data, error } = await getProfile(userId);
      if (error) {
        console.warn('[auth] getProfile error:', error.message);
        if (retry < 2) {
          await new Promise((r) => setTimeout(r, 350));
          return loadProfileSafe(sess, { retry: retry + 1 });
        }
        setProfileError(error);
        setProfile(fallbackProfileFromSession(sess));
        return null;
      }
      if (!data) {
        // Profile row probably not yet created by trigger — retry briefly.
        if (retry < 4) {
          await new Promise((r) => setTimeout(r, 400));
          return loadProfileSafe(sess, { retry: retry + 1 });
        }
        // Session is live but no matching profile row — treat as a stale/deleted
        // account and force-clear the session so route guards send them to /.
        console.warn('[auth] Session has no matching profile row. Signing out.');
        try {
          await supabase.auth.signOut();
        } catch (signOutErr) {
          console.error('[auth] signOut after missing profile failed:', signOutErr);
        }
        setSession(null);
        setProfile(null);
        setProfileError(null);
        if (typeof window !== 'undefined' && window.location.pathname !== '/') {
          window.location.assign('/');
        }
        return null;
      }
      setProfile(data);
      setProfileError(null);
      return data;
    } catch (err) {
      console.error('[auth] loadProfile threw:', err);
      setProfileError(err);
      setProfile(fallbackProfileFromSession(sess));
      return null;
    }
  }

  async function refresh() {
    if (session) await loadProfileSafe(session);
  }

  async function login(identifier, password) {
    const id = (identifier || '').trim();
    if (!id || !password) {
      return { ok: false, error: 'Enter your username or email and password.' };
    }
    try {
      let emailToUse = id;

      if (!id.includes('@')) {
        const { data: row, error: lookupError } = await supabase
          .from('profiles')
          .select('email')
          .ilike('username', id)
          .maybeSingle();
        if (lookupError) return { ok: false, error: lookupError.message };
        if (!row?.email) {
          return { ok: false, error: 'No account found for that username.' };
        }
        emailToUse = row.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });
      if (error) return { ok: false, error: error.message };

      setSession(data.session);
      if (data.session) await loadProfileSafe(data.session);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || 'Login failed.' };
    }
  }

  function detectChannel(contact) {
    const c = (contact || '').trim();
    if (!c) return null;
    if (c.includes('@')) return 'email';
    // Phone: starts with + or is all digits (with optional spaces / dashes).
    if (/^\+?[\d\s\-().]{7,}$/.test(c)) return 'phone';
    return null;
  }

  function normalizePhone(raw) {
    const digits = (raw || '').replace(/\D/g, '');
    if (digits.length === 10) return '+1' + digits;
    if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
    return '+' + digits;
  }

  function passwordPolicyError(p) {
    if (p.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(p)) return 'Password must include an uppercase letter.';
    if (!/[a-z]/.test(p)) return 'Password must include a lowercase letter.';
    if (!/\d/.test(p)) return 'Password must include a number.';
    if (!/[^A-Za-z0-9]/.test(p)) return 'Password must include a special character.';
    return null;
  }

  async function signup({ fullName, contact, username, password }) {
    if (!fullName || !contact || !username || !password) {
      return { ok: false, error: 'Full name, contact, username, and password are required.' };
    }
    const pwError = passwordPolicyError(password);
    if (pwError) return { ok: false, error: pwError };

    const channel = detectChannel(contact);
    console.log('[AuthContext.signup] contact =', JSON.stringify(contact), '| detected channel =', channel);
    if (!channel) {
      return { ok: false, error: 'Enter a valid email or phone number (with country code, e.g. +14155551234).' };
    }

    const meta = {
      data: {
        full_name: fullName.trim(),
        username: username.trim().toLowerCase(),
      },
    };

    try {
      let payload;
      let identifier;
      if (channel === 'email') {
        identifier = contact.trim();
        payload = { email: identifier, password, options: meta };
      } else {
        identifier = normalizePhone(contact);
        payload = { phone: identifier, password, options: meta };
      }
      console.log('[AuthContext.signup] supabase.auth.signUp payload =', { ...payload, password: '***' });

      const { data, error } = await supabase.auth.signUp(payload);
      if (channel === 'phone') {
        const serializableError = error
          ? { message: error.message, status: error.status, name: error.name, code: error.code }
          : null;
        console.log(
          '[Phone Signup] Full result:',
          JSON.stringify({ data, error: serializableError }, null, 2)
        );
      }
      if (error) {
        console.error('[AuthContext.signup] supabase.auth.signUp error =', {
          message: error.message,
          status: error.status,
          name: error.name,
          code: error.code,
          full: error,
        });
        return { ok: false, error: error.message, code: error.code, channel };
      }
      console.log('[AuthContext.signup] supabase.auth.signUp success =', {
        userId: data?.user?.id,
        hasSession: !!data?.session,
        identitiesCount: data?.user?.identities?.length,
      });
      if (!data.user) return { ok: false, error: 'Sign-up failed — no user returned.' };

      if (data.session) {
        setSession(data.session);
        await loadProfileSafe(data.session);
        return { ok: true, verified: true, channel, identifier };
      }
      return { ok: true, verified: false, channel, identifier };
    } catch (err) {
      console.error('[AuthContext.signup] threw exception =', err);
      return { ok: false, error: err?.message || 'Sign-up failed.' };
    }
  }

  async function verifyOtp({ channel, identifier, token }) {
    const code = (token || '').trim();
    if (!code) {
      return { ok: false, error: 'Invalid code. Please try again.' };
    }
    try {
      const payload =
        channel === 'phone'
          ? { phone: identifier, token: code, type: 'sms' }
          : { email: identifier, token: code, type: 'signup' };
      console.log('[AuthContext.verifyOtp] payload =', payload);
      const { data, error } = await supabase.auth.verifyOtp(payload);
      if (error) {
        console.error('[AuthContext.verifyOtp] error =', {
          message: error.message,
          status: error.status,
          name: error.name,
          code: error.code,
          full: error,
        });
        return { ok: false, error: 'Invalid code. Please try again.' };
      }
      if (data.session) {
        setSession(data.session);
        await loadProfileSafe(data.session);
      }
      return { ok: true };
    } catch (err) {
      console.error('[AuthContext.verifyOtp] threw exception =', err);
      return { ok: false, error: 'Invalid code. Please try again.' };
    }
  }

  async function resendOtp({ channel, identifier }) {
    try {
      const payload =
        channel === 'phone'
          ? { type: 'sms', phone: identifier }
          : { type: 'signup', email: identifier };
      console.log('[AuthContext.resendOtp] payload =', payload);
      const { error } = await supabase.auth.resend(payload);
      if (error) {
        console.error('[AuthContext.resendOtp] error =', {
          message: error.message,
          status: error.status,
          name: error.name,
          code: error.code,
          full: error,
        });
        return { ok: false, error: error.message };
      }
      return { ok: true };
    } catch (err) {
      console.error('[AuthContext.resendOtp] threw exception =', err);
      return { ok: false, error: err?.message || 'Could not resend code.' };
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setProfile(null);
      setProfileError(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user: profile,
        session,
        ready,
        profileError,
        login,
        signup,
        verifyOtp,
        resendOtp,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
