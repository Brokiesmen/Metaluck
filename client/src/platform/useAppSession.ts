import { useCallback, useEffect, useState } from 'react';
import { api, getAuthToken, setAuthToken, setInitData } from '../api';
import { setDemoBalanceSnapshot, setDemoPrizePool } from '../demo';
import { useDemoMode } from '../demo/useDemoMode';
import { useClientType } from '../hooks/useClientType';
import { useTelegram } from '../hooks/useTelegram';
import { applyTheme } from '../settings/applyTheme';
import { useSettings } from '../settings/SettingsContext';
import { startTelegramViewportSync } from '../lib/telegramViewport';
import type { Case, Prize, TelegramUser, WebUser } from '../types';

function toTgUser(u: WebUser): TelegramUser {
  const name = u.username || (u.email ? u.email.split('@')[0] : `user${u.id}`);
  return {
    id: u.id,
    first_name: name,
    last_name: '',
    username: u.username ?? undefined,
    photo_url: u.avatar ?? undefined,
  };
}

export type AuthGate = 'checking' | 'anon' | 'authed';

export function useAppSession() {
  const { tg, user, initData, isDev } = useTelegram();
  const { client, isTelegramWebApp, isDesktopWeb } = useClientType();
  const { t, locale, theme } = useSettings();
  const { isDemo, setDemo } = useDemoMode();

  setInitData(initData);

  const [authGate, setAuthGate] = useState<AuthGate>(
    isTelegramWebApp ? 'authed' : 'checking',
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [balance, setBalance] = useState(0);
  const [cases, setCases] = useState<Case[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const updateBalance = useCallback((b: number) => {
    setBalance(b);
    setDemoBalanceSnapshot(b);
  }, []);

  const onWebLogin = useCallback((u: WebUser) => {
    window.__webUser = toTgUser(u);
    setAuthGate('authed');
  }, []);

  const logout = useCallback(() => {
    // Сначала bump session_version на сервере, потом чистим localStorage.
    void api
      .authLogout()
      .catch(() => {})
      .finally(() => {
        setAuthToken(null);
        window.__webUser = null;
        setAuthGate('anon');
      });
  }, []);

  const openSettings = useCallback(() => setShowSettings(true), []);
  const closeSettings = useCallback(() => setShowSettings(false), []);

  const reloadCases = useCallback(() => {
    api.getCases().then(setCases).catch(() => {});
  }, []);

  useEffect(() => {
    // @ts-ignore
    setLogs(window.startupLog || []);
    // @ts-ignore
    window.log = (m: string) => setLogs((prev: string[]) => [...prev.slice(-10), m]);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, tg]);

  useEffect(() => startTelegramViewportSync(), []);

  useEffect(() => {
    if (!isDesktopWeb) return;
    if (!getAuthToken()) {
      setAuthGate('anon');
      return;
    }
    let alive = true;
    api.authMe()
      .then((u) => {
        if (!alive) return;
        window.__webUser = toTgUser(u);
        setAuthGate('authed');
      })
      .catch(() => {
        if (!alive) return;
        setAuthToken(null);
        window.__webUser = null;
        setAuthGate('anon');
      });
    return () => {
      alive = false;
    };
  }, [isDesktopWeb]);

  useEffect(() => {
    if (authGate !== 'authed') return;

    if (tg) {
      tg.ready();
      tg.expand();
      applyTheme(theme);
    }

    Promise.all([api.getBalance(), api.getCases(), api.getPrizes()])
      .then(([bal, c, p]) => {
        updateBalance(bal);
        setCases(c);
        setPrizes(p);
        setDemoPrizePool(p);
      })
      .catch((err) => {
        console.error('Initial load failed:', err);
        setError(t.common.serverUnavailable);
      });

    api.adminMe()
      .then((r) => setIsAdmin(Boolean(r.isAdmin)))
      .catch(() => setIsAdmin(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot once authenticated
  }, [tg, initData, authGate]);

  useEffect(() => {
    setDemoBalanceSnapshot(balance);
  }, [balance]);

  useEffect(() => {
    setDemoPrizePool(prizes);
  }, [prizes]);

  useEffect(() => {
    if (authGate !== 'authed') return;
    api.getCases().then(setCases).catch(() => {});
  }, [isDemo, authGate]);

  const displayName = user.username
    ? `@${user.username}`
    : [user.first_name, user.last_name].filter(Boolean).join(' ') || `user${user.id}`;

  const openInvoice = tg?.openInvoice?.bind(tg);

  return {
    tg,
    user,
    initData,
    isDev,
    client,
    isTelegramWebApp,
    isDesktopWeb,
    t,
    locale,
    theme,
    isDemo,
    setDemo,
    authGate,
    isAdmin,
    balance,
    cases,
    prizes,
    error,
    logs,
    showSettings,
    displayName,
    openInvoice,
    updateBalance,
    onWebLogin,
    logout,
    openSettings,
    closeSettings,
    reloadCases,
  };
}

export type AppSession = ReturnType<typeof useAppSession>;
