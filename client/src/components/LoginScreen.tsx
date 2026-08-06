import { useEffect, useRef, useState } from 'react';
import { api, setAuthToken } from '../api';
import type { WebUser } from '../types';
import { useSettings } from '../settings/SettingsContext';

interface Props {
  onLogin: (user: WebUser) => void;
}

const GOOGLE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();
const TELEGRAM_BOT = String(import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? '').trim().replace(/^@/, '');

/** Однократная загрузка внешнего скрипта. */
function loadScript(src: string, attrs?: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing && !attrs) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    if (attrs) for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`failed to load ${src}`));
    (attrs?.__target ? document.getElementById(attrs.__target) : document.head)?.appendChild(s);
  });
}

export function LoginScreen({ onLogin }: Props) {
  const { t } = useSettings();
  const [busy, setBusy] = useState<null | 'google' | 'telegram'>(null);
  const [err, setErr] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const tgHolderRef = useRef<HTMLDivElement>(null);

  const finish = (res: { token: string; user: WebUser }) => {
    setAuthToken(res.token);
    onLogin(res.user);
  };

  // ── Google Identity Services ───────────────────────────────────────────────
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadScript('https://accounts.google.com/gsi/client')
      .then(() => {
        if (cancelled || !window.google || !googleBtnRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (resp) => {
            setBusy('google');
            setErr(null);
            api
              .authGoogle(resp.credential)
              .then(finish)
              .catch((e) => setErr(e instanceof Error ? e.message : t.auth.googleError))
              .finally(() => setBusy(null));
          },
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: 280,
        });
      })
      .catch(() => setErr(t.auth.googleError));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Telegram Login Widget ──────────────────────────────────────────────────
  useEffect(() => {
    if (!TELEGRAM_BOT || !tgHolderRef.current) return;
    window.onTelegramAuth = (tgUser) => {
      setBusy('telegram');
      setErr(null);
      const payload: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(tgUser)) {
        if (v !== undefined && v !== null) payload[k] = v as string | number;
      }
      api
        .authTelegram(payload)
        .then(finish)
        .catch((e) => setErr(e instanceof Error ? e.message : t.auth.telegramError))
        .finally(() => setBusy(null));
    };

    const holder = tgHolderRef.current;
    holder.innerHTML = '';
    const s = document.createElement('script');
    s.src = 'https://telegram.org/js/telegram-widget.js?22';
    s.async = true;
    s.setAttribute('data-telegram-login', TELEGRAM_BOT);
    s.setAttribute('data-size', 'large');
    s.setAttribute('data-radius', '14');
    s.setAttribute('data-onauth', 'onTelegramAuth(user)');
    s.setAttribute('data-request-access', 'write');
    holder.appendChild(s);

    return () => {
      window.onTelegramAuth = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo" aria-hidden>✦</div>
        <h1 className="login-title">{t.auth.title}</h1>
        <p className="login-subtitle">{t.auth.subtitle}</p>

        <div className="login-methods">
          {TELEGRAM_BOT ? (
            <div ref={tgHolderRef} className="login-tg-holder" />
          ) : (
            <div className="login-disabled">{t.auth.telegramUnavailable}</div>
          )}

          {GOOGLE_CLIENT_ID ? (
            <div ref={googleBtnRef} className="login-google-holder" />
          ) : (
            <div className="login-disabled">{t.auth.googleUnavailable}</div>
          )}
        </div>

        {busy && <div className="login-status">{t.auth.signingIn}</div>}
        {err && <div className="login-error" role="alert">{err}</div>}

        <p className="login-hint">{t.auth.miniAppHint}</p>
      </div>
    </div>
  );
}
