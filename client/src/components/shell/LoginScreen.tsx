import { useState } from 'react';
import { useAuth } from './auth/AuthProvider';
import { haptic } from './telegram';

/** UI входа (браузер). Отделён от AuthProvider — вся логика в сервисе/контексте. */
export function LoginScreen() {
  const { loginTelegram, loginGoogle } = useAuth();
  const [busy, setBusy] = useState<null | 'telegram' | 'google'>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = async (which: 'telegram' | 'google') => {
    setBusy(which);
    setErr(null);
    haptic.impact('light');
    try {
      if (which === 'telegram') await loginTelegram();
      else await loginGoogle();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="sh-shell sh-login-wrap">
      <div className="sh-login">
        <div className="sh-login-brand">
          <span className="sh-login-mark" aria-hidden>✦</span>
          <span className="sh-login-name">Metaluck</span>
        </div>
        <h1 className="sh-login-title">Sign in to play</h1>
        <p className="sh-login-sub">Cases, mini-games and wallet — on any device.</p>

        <div className="sh-login-methods">
          <button
            type="button"
            className="sh-login-btn sh-login-btn--telegram"
            disabled={busy !== null}
            onClick={() => void run('telegram')}
          >
            <span aria-hidden>✈️</span>
            {busy === 'telegram' ? 'Connecting…' : 'Continue with Telegram'}
          </button>
          <button
            type="button"
            className="sh-login-btn sh-login-btn--google"
            disabled={busy !== null}
            onClick={() => void run('google')}
          >
            <span aria-hidden>🟢</span>
            {busy === 'google' ? 'Connecting…' : 'Continue with Google'}
          </button>
        </div>

        {err && <div className="sh-login-error" role="alert">{err}</div>}
        <p className="sh-login-hint">Already in Telegram? Open the mini app — no sign-in needed.</p>
      </div>
    </div>
  );
}
