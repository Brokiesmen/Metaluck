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

function readChallengeFromUrl(): string | null {
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.get('auth') !== 'tg') return null;
    const c = u.searchParams.get('c');
    return c && c.length >= 16 ? c : null;
  } catch {
    return null;
  }
}

function clearAuthQuery() {
  try {
    const u = new URL(window.location.href);
    if (!u.searchParams.has('auth') && !u.searchParams.has('c')) return;
    u.searchParams.delete('auth');
    u.searchParams.delete('c');
    window.history.replaceState({}, '', u.pathname + u.search + u.hash);
  } catch {
    /* ignore */
  }
}

export function LoginScreen({ onLogin }: Props) {
  const { t } = useSettings();
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [configError, setConfigError] = useState(false);
  const [busy, setBusy] = useState<null | 'google' | 'telegram'>(null);
  const [tgWaiting, setTgWaiting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const finish = (res: { token: string; user: WebUser }) => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setAuthToken(res.token);
    clearAuthQuery();
    onLogin(res.user);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setTgWaiting(false);
    setBusy((b) => (b === 'telegram' ? null : b));
  };

  const pollChallenge = (challengeId: string, intervalMs = 2000) => {
    setTgWaiting(true);
    setBusy('telegram');
    setErr(null);
    if (pollRef.current) clearInterval(pollRef.current);

    const tick = async () => {
      try {
        const r = await api.authTelegramPoll(challengeId);
        if (r.status === 'ready' && r.token && r.user) {
          finish({ token: r.token, user: r.user });
          return;
        }
        if (r.status === 'expired') {
          stopPolling();
          setErr(t.auth.telegramExpired);
        }
      } catch {
        /* keep polling briefly on network blips */
      }
    };

    void tick();
    pollRef.current = setInterval(() => void tick(), Math.max(1500, intervalMs));
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

  // Return from bot button ?auth=tg&c=...
  useEffect(() => {
    const fromUrl = readChallengeFromUrl();
    if (!fromUrl) return;
    pollChallenge(fromUrl);
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => stopPolling(), []);

  const cfg = config;

  // ── Google Identity Services — official button (custom click + hidden iframe is unreliable) ──
  useEffect(() => {
    if (!cfg?.googleClientId || !cfg.googleLoginReady) return;
    let cancelled = false;
    setGoogleReady(false);

    const mount = () => {
      if (cancelled || !window.google || !googleBtnRef.current) return;
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: cfg.googleClientId!,
        ux_mode: 'popup',
        auto_select: false,
        cancel_on_tap_outside: true,
        // FedCM often blocks One Tap / synthetic clicks in desktop Chrome.
        use_fedcm_for_prompt: false,
        callback: (resp) => {
          if (!resp?.credential) {
            setErr(t.auth.googleError);
            return;
          }
          setBusy('google');
          setErr(null);
          api
            .authGoogle(resp.credential)
            .then(finish)
            .catch((e) => setErr(e instanceof Error ? e.message : t.auth.googleError))
            .finally(() => setBusy(null));
        },
      });
      const width = Math.min(320, Math.max(260, googleBtnRef.current.clientWidth || 320));
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width,
        logo_alignment: 'left',
      });
      setGoogleReady(true);
    };

    loadScript('https://accounts.google.com/gsi/client')
      .then(() => {
        // Ref is ready after paint of the holder.
        requestAnimationFrame(mount);
      })
      .catch(() => setErr(t.auth.googleError));

    return () => {
      cancelled = true;
    };
  }, [cfg?.googleClientId, cfg?.googleLoginReady, t.auth.googleError]);

  const startTelegram = async () => {
    if (!cfg?.telegramLoginReady) return;
    setBusy('telegram');
    setErr(null);
    try {
      const started = await api.authTelegramStart();
      window.open(started.deepLink, '_blank', 'noopener,noreferrer');
      pollChallenge(started.challengeId, started.pollIntervalMs);
    } catch (e) {
      setBusy(null);
      setErr(e instanceof Error ? e.message : t.auth.telegramError);
    }
  };

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
              {cfg.telegramLoginReady ? (
                <>
                  <button
                    type="button"
                    className="login-provider-btn login-provider-btn--telegram"
                    disabled={busy === 'telegram'}
                    onClick={() => void startTelegram()}
                  >
                    <TelegramGlyph />
                    <span>{t.auth.continueTelegram}</span>
                  </button>
                  {tgWaiting && (
                    <p className="login-wait-hint">{t.auth.telegramWaiting}</p>
                  )}
                </>
              ) : (
                <div className="login-disabled">{t.auth.telegramUnavailable}</div>
              )}
            </div>

            <div className="login-divider">
              <span>{t.auth.or}</span>
            </div>

            <div className="login-method">
              {cfg.googleLoginReady && cfg.googleClientId ? (
                <div className="login-google-wrap">
                  {!googleReady && (
                    <div className="login-status">{t.auth.signingIn}</div>
                  )}
                  <div
                    ref={googleBtnRef}
                    className={`login-google-holder${busy === 'google' ? ' login-google-holder--busy' : ''}`}
                  />
                </div>
              ) : (
                <div className="login-disabled">{t.auth.googleUnavailable}</div>
              )}
            </div>
          </div>
        )}

        {busy && !tgWaiting && (
          <div className="login-status login-status--pulse">{t.auth.signingIn}</div>
        )}
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

        <p className="login-hint">{t.auth.miniAppHint}</p>
      </div>
    </div>
  );
}

function TelegramGlyph() {
  return (
    <svg className="login-provider-icon" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8-1.55 7.31c-.12.53-.43.66-.87.41l-2.4-1.77-1.16 1.12c-.13.13-.24.24-.49.24l.17-2.43 4.45-4.02c.19-.17-.04-.27-.3-.1l-5.5 3.46-2.37-.74c-.51-.16-.52-.51.11-.76l9.26-3.57c.43-.16.8.1.65.72z"
      />
    </svg>
  );
}

