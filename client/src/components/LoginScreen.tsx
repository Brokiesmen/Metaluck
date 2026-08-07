import { useEffect, useRef, useState } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { api, setAuthToken } from '../api';
import type { WebUser } from '../types';
import { useSettings } from '../settings/SettingsContext';
import { StarIcon } from './StarIcon';
import { connectEvmWallet } from '../lib/evmLogin';

interface Props {
  onLogin: (user: WebUser) => void;
}

type AuthConfig = {
  telegramBot: string | null;
  googleClientId: string | null;
  sessionReady: boolean;
  telegramLoginReady: boolean;
  googleLoginReady: boolean;
  tonLoginReady: boolean;
  evmLoginReady: boolean;
  walletConnectProjectId: string | null;
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

function resolveConfig(
  remote: (Partial<AuthConfig> & {
    tonLoginReady?: boolean;
    evmLoginReady?: boolean;
    walletConnectProjectId?: string | null;
  }) | null,
): AuthConfig {
  const viteTg = String(import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? '')
    .trim()
    .replace(/^@/, '');
  const viteGoogle = String(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();
  const viteWc = String(import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? '').trim();
  const telegramBot = remote?.telegramBot || viteTg || null;
  const googleClientId = remote?.googleClientId || viteGoogle || null;
  const walletConnectProjectId = remote?.walletConnectProjectId || viteWc || null;
  return {
    telegramBot,
    googleClientId,
    sessionReady: remote?.sessionReady ?? true,
    telegramLoginReady: remote?.telegramLoginReady ?? Boolean(telegramBot),
    googleLoginReady: remote?.googleLoginReady ?? Boolean(googleClientId),
    tonLoginReady: remote?.tonLoginReady ?? remote?.sessionReady ?? true,
    evmLoginReady: remote?.evmLoginReady ?? remote?.sessionReady ?? true,
    walletConnectProjectId,
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
  const [tonConnectUI] = useTonConnectUI();
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [configError, setConfigError] = useState(false);
  const [busy, setBusy] = useState<null | 'google' | 'telegram' | 'ton' | 'evm'>(null);
  const [tgWaiting, setTgWaiting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tonLoginRef = useRef(false);

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

  useEffect(() => {
    const fromUrl = readChallengeFromUrl();
    if (!fromUrl) return;
    pollChallenge(fromUrl);
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => stopPolling(), []);

  // TON Connect → server login after ton_proof
  useEffect(() => {
    return tonConnectUI.onStatusChange(async (w) => {
      if (!w || !tonLoginRef.current) return;
      const proofItem = w.connectItems?.tonProof;
      if (!proofItem || !('proof' in proofItem)) {
        tonLoginRef.current = false;
        setBusy(null);
        setErr(t.auth.walletError);
        void tonConnectUI.disconnect().catch(() => {});
        return;
      }
      tonLoginRef.current = false;
      setBusy('ton');
      setErr(null);
      try {
        const res = await api.authTon({
          address: w.account.address,
          network: w.account.chain,
          publicKey: w.account.publicKey,
          proof: proofItem.proof,
        });
        finish(res);
      } catch (e) {
        setErr(e instanceof Error ? e.message : t.auth.walletError);
      } finally {
        setBusy(null);
        void tonConnectUI.disconnect().catch(() => {});
      }
    });
  }, [tonConnectUI, t.auth.walletError]);

  const cfg = config;

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
      const width = Math.min(360, Math.max(280, googleBtnRef.current.clientWidth || 320));
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

  const startTon = async () => {
    if (!cfg?.tonLoginReady) return;
    setErr(null);
    setBusy('ton');
    try {
      tonConnectUI.setConnectRequestParameters({ state: 'loading' });
      const { nonce } = await api.authWalletChallenge('ton');
      tonConnectUI.setConnectRequestParameters({ state: 'ready', value: { tonProof: nonce } });
      tonLoginRef.current = true;
      if (tonConnectUI.connected) await tonConnectUI.disconnect();
      await tonConnectUI.openModal();
      setBusy(null);
    } catch (e) {
      tonLoginRef.current = false;
      tonConnectUI.setConnectRequestParameters(null);
      setBusy(null);
      setErr(e instanceof Error ? e.message : t.auth.walletError);
    }
  };

  const startEvm = async () => {
    if (!cfg?.evmLoginReady) return;
    setBusy('evm');
    setErr(null);
    let cleanup: (() => Promise<void>) | null = null;
    try {
      const session = await connectEvmWallet({ projectId: cfg.walletConnectProjectId });
      cleanup = session.cleanup;
      const { nonce } = await api.authWalletChallenge('evm');
      const { message } = await api.authWalletEvmMessage(session.address, nonce);
      const signature = await session.signMessage(message);
      const res = await api.authEvm({
        address: session.address,
        message,
        signature,
        nonce,
      });
      finish(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'NO_WALLET' || msg === 'NO_INJECTED') {
        setErr(
          cfg.walletConnectProjectId
            ? t.auth.walletError
            : 'Установите MetaMask или задайте WALLETCONNECT_PROJECT_ID',
        );
      } else {
        setErr(msg || t.auth.walletError);
      }
    } finally {
      setBusy(null);
      if (cleanup) await cleanup().catch(() => {});
    }
  };

  const loading = !cfg;
  const anyBusy = busy != null;

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
                    disabled={anyBusy}
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
                  <button
                    type="button"
                    className="login-provider-btn login-provider-btn--google"
                    disabled={!googleReady || anyBusy}
                    tabIndex={-1}
                    aria-hidden
                  >
                    <GoogleGlyph />
                    <span>{t.auth.continueGoogle}</span>
                  </button>
                  {/* Официальный GIS поверх нашей кнопки — клик идёт в Google iframe */}
                  <div
                    ref={googleBtnRef}
                    className={`login-google-overlay${busy === 'google' ? ' login-google-overlay--busy' : ''}`}
                    aria-label={t.auth.continueGoogle}
                  />
                  {!googleReady && (
                    <div className="login-status login-google-loading">{t.auth.signingIn}</div>
                  )}
                </div>
              ) : (
                <div className="login-disabled">{t.auth.googleUnavailable}</div>
              )}
            </div>

            {(cfg.tonLoginReady || cfg.evmLoginReady) && (
              <>
                <div className="login-divider">
                  <span>{t.auth.or}</span>
                </div>

                {cfg.tonLoginReady && (
                  <div className="login-method">
                    <button
                      type="button"
                      className="login-provider-btn login-provider-btn--ton"
                      disabled={anyBusy}
                      onClick={() => void startTon()}
                    >
                      <TonGlyph />
                      <span>{t.auth.continueTon}</span>
                    </button>
                  </div>
                )}

                {cfg.evmLoginReady && (
                  <div className="login-method">
                    <button
                      type="button"
                      className="login-provider-btn login-provider-btn--evm"
                      disabled={anyBusy}
                      onClick={() => void startEvm()}
                    >
                      <WcGlyph />
                      <span>{t.auth.continueEvm}</span>
                    </button>
                  </div>
                )}
              </>
            )}
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

function GoogleGlyph() {
  return (
    <svg className="login-provider-icon" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function TonGlyph() {
  return (
    <svg className="login-provider-icon" viewBox="0 0 56 56" aria-hidden>
      <path
        fill="currentColor"
        d="M28 8c-2.2 0-4 .5-4.9 1.3L9.2 20.6c-1.6 1.3-.3 3.8 1.8 3.5l15.4-1.9c.9-.1 1.8-.1 2.7 0l15.4 1.9c2.1.3 3.4-2.2 1.8-3.5L32.9 9.3C32 8.5 30.2 8 28 8zm-1.6 18.3-1.1 16.2c-.1 1.5 1.7 2.4 2.8 1.4l13.5-12.2c1.4-1.3.4-3.6-1.5-3.5l-13.7.1zm-2.3 16.2-1.1-16.2-13.7-.1c-1.9-.1-2.9 2.2-1.5 3.5l13.5 12.2c1.1 1 2.9.1 2.8-1.4z"
      />
    </svg>
  );
}

function WcGlyph() {
  return (
    <svg className="login-provider-icon" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M6.5 9.3c3.5-3.4 9.1-3.4 12.6 0l.4.4c.2.2.2.5 0 .6l-1.4 1.4c-.1.1-.3.1-.4 0l-.6-.6c-2.4-2.4-6.4-2.4-8.8 0l-.6.6c-.1.1-.3.1-.4 0L5.9 10.3c-.2-.2-.2-.5 0-.6l.6-.4zm15.6 2.9 1.3 1.3c.2.2.2.5 0 .6l-5.7 5.6c-.2.2-.5.2-.7 0l-4-4c-.1 0-.1 0-.2 0s-.1 0-.2 0l-4 4c-.2.2-.5.2-.7 0L1.5 14.1c-.2-.2-.2-.5 0-.6l1.3-1.3c.2-.2.5-.2.7 0l4 4c.1 0 .1 0 .2 0s.1 0 .2 0l4-4c.2-.2.5-.2.7 0l4 4c.1 0 .1 0 .2 0s.1 0 .2 0l4-4c.1-.1.4-.1.6 0z"
      />
    </svg>
  );
}
