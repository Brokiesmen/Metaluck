import { useEffect, useRef, useState } from 'react';
import { api, setAuthToken } from '../api';
import type { WebUser } from '../types';
import { useSettings } from '../settings/SettingsContext';
import { StarIcon } from './StarIcon';

interface Props {
  onLogin: (user: WebUser) => void;
}

type AuthConfig = {
  telegramBot: string | null;
  googleClientId: string | null;
  sessionReady: boolean;
  telegramLoginReady: boolean;
  googleLoginReady: boolean;
};

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function resolveConfig(remote: AuthConfig | null): AuthConfig {
  const viteTg = String(import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? '')
    .trim()
    .replace(/^@/, '');
  const viteGoogle = String(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();
  const telegramBot = remote?.telegramBot || viteTg || null;
  const googleClientId = remote?.googleClientId || viteGoogle || null;
  return {
    telegramBot,
    googleClientId,
    sessionReady: remote?.sessionReady ?? true,
    telegramLoginReady: remote?.telegramLoginReady ?? Boolean(telegramBot),
    googleLoginReady: remote?.googleLoginReady ?? Boolean(googleClientId),
  };
}

export function LoginScreen({ onLogin }: Props) {
  const { t } = useSettings();
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [configError, setConfigError] = useState(false);
  const [busy, setBusy] = useState<null | 'google' | 'telegram'>(null);
  const [err, setErr] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const tgHolderRef = useRef<HTMLDivElement>(null);

  const finish = (res: { token: string; user: WebUser }) => {
    setAuthToken(res.token);
    onLogin(res.user);
  };

  useEffect(() => {
    let alive = true;
    api
      .authConfig()
      .then((c) => {
        if (alive) setConfig(resolveConfig(c));
      })
      .catch(() => {
        if (!alive) return;
        setConfigError(true);
        setConfig(resolveConfig(null));
      });
    return () => {
      alive = false;
    };
  }, []);

  const cfg = config;

  // ── Google Identity Services ───────────────────────────────────────────────
  useEffect(() => {
    if (!cfg?.googleClientId || !cfg.googleLoginReady) return;
    let cancelled = false;
    loadScript('https://accounts.google.com/gsi/client')
      .then(() => {
        if (cancelled || !window.google || !googleBtnRef.current) return;
        window.google.accounts.id.initialize({
          client_id: cfg.googleClientId!,
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
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: 320,
          logo_alignment: 'left',
        });
      })
      .catch(() => setErr(t.auth.googleError));
    return () => {
      cancelled = true;
    };
  }, [cfg?.googleClientId, cfg?.googleLoginReady, t.auth.googleError]);

  // ── Telegram Login Widget ──────────────────────────────────────────────────
  useEffect(() => {
    if (!cfg?.telegramBot || !cfg.telegramLoginReady || !tgHolderRef.current) return;
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
    s.setAttribute('data-telegram-login', cfg.telegramBot);
    s.setAttribute('data-size', 'large');
    s.setAttribute('data-radius', '20');
    s.setAttribute('data-onauth', 'onTelegramAuth(user)');
    s.setAttribute('data-request-access', 'write');
    s.setAttribute('data-userpic', 'false');
    holder.appendChild(s);

    return () => {
      window.onTelegramAuth = undefined;
    };
  }, [cfg?.telegramBot, cfg?.telegramLoginReady, t.auth.telegramError]);

  const botLink = cfg?.telegramBot ? `https://t.me/${cfg.telegramBot}` : null;
  const loading = !cfg;

  return (
    <div className="login-screen">
      <div className="login-bg" aria-hidden>
        <div className="login-bg-glow login-bg-glow--a" />
        <div className="login-bg-glow login-bg-glow--b" />
        <div className="login-bg-grid" />
      </div>

      <div className="login-panel">
        <div className="login-brand">
          <div className="login-brand-mark">
            <StarIcon size={36} animate glow />
          </div>
          <div className="login-brand-name">{t.desktop.brand}</div>
        </div>

        <h1 className="login-title">{t.auth.title}</h1>
        <p className="login-subtitle">{t.auth.subtitle}</p>

        {loading ? (
          <div className="login-status">{t.common.loading}</div>
        ) : (
          <div className="login-methods">
            <div className="login-method">
              <div className="login-method-label">{t.auth.continueTelegram}</div>
              {cfg.telegramLoginReady && cfg.telegramBot ? (
                <div ref={tgHolderRef} className="login-tg-holder" />
              ) : (
                <div className="login-disabled">{t.auth.telegramUnavailable}</div>
              )}
            </div>

            <div className="login-divider">
              <span>{t.auth.or}</span>
            </div>

            <div className="login-method">
              <div className="login-method-label">{t.auth.continueGoogle}</div>
              {cfg.googleLoginReady && cfg.googleClientId ? (
                <div ref={googleBtnRef} className="login-google-holder" />
              ) : (
                <div className="login-disabled">{t.auth.googleUnavailable}</div>
              )}
            </div>
          </div>
        )}

        {busy && <div className="login-status login-status--pulse">{t.auth.signingIn}</div>}
        {err && (
          <div className="login-error" role="alert">
            {err}
          </div>
        )}
        {configError && !err && (
          <div className="login-error" role="alert">
            {t.common.serverUnavailable}
          </div>
        )}

        {botLink && (
          <a className="login-bot-link" href={botLink} target="_blank" rel="noreferrer">
            {t.auth.openBot}
          </a>
        )}

        <p className="login-hint">{t.auth.miniAppHint}</p>
      </div>
    </div>
  );
}
