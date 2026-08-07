import { useMemo, useState, type ReactNode } from 'react';
import { LoginScreen } from '../LoginScreen';
import { SettingsModal } from '../SettingsModal';
import {
  AppMainContent,
  pageContentModifier,
  resolveHeaderTitle,
  useAppNavigation,
  useAppSession,
  type AppSession,
} from '../../platform';
import type { AppSection } from '../../platform/types';
import { PlatformProvider, type Platform } from './PlatformProvider';
import { DesktopShell } from './DesktopShell';
import { TelegramShell } from './TelegramShell';
import type { NavId } from './navItems';
import './shell.css';

function navIdToSection(id: NavId): AppSection | 'settings' {
  if (id === 'lobby') return 'games';
  if (id === 'balance') return 'wallet';
  if (id === 'rewards') return 'rewards';
  if (id === 'profile') return 'profile';
  return 'settings';
}

function sectionToNavId(section: AppSection): NavId {
  if (section === 'wallet') return 'balance';
  if (section === 'rewards') return 'rewards';
  if (section === 'profile') return 'profile';
  return 'lobby';
}

function formatBalance(n: number): string {
  return `${Math.floor(n).toLocaleString('ru-RU')} ★`;
}

function LiveAuthGate({
  session,
  children,
}: {
  session: AppSession;
  children: ReactNode;
}) {
  const { isDesktopWeb, authGate, t, onWebLogin, client } = session;

  if (!isDesktopWeb) return <>{children}</>;

  if (authGate === 'checking') {
    return (
      <div className="app app--login" data-client={client}>
        <div className="login-screen">
          <div className="login-bg" aria-hidden>
            <div className="login-bg-glow login-bg-glow--a" />
            <div className="login-bg-glow login-bg-glow--b" />
            <div className="login-bg-grid" />
          </div>
          <div className="login-panel login-panel--loading">
            <div className="login-brand-mark">
              <span className="login-status login-status--pulse">{t.common.loading}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (authGate === 'anon') {
    return (
      <div className="app app--login" data-client={client}>
        <LoginScreen onLogin={onWebLogin} />
      </div>
    );
  }

  return <>{children}</>;
}

function ShellLiveInner({
  session,
  force,
}: {
  session: AppSession;
  force?: Platform;
}) {
  const nav = useAppNavigation(session.isDesktopWeb ? 'home' : 'games');
  const [showSettingsLocal, setShowSettingsLocal] = useState(false);

  const {
    isDemo,
    error,
    balance,
    user,
    displayName,
    t,
    logout,
    showSettings,
    openSettings,
    closeSettings,
    client,
    isTelegramWebApp,
  } = session;

  const useTelegramChrome =
    force === 'telegram' ? true : force === 'desktop' ? false : isTelegramWebApp;

  const settingsOpen = showSettings || showSettingsLocal;
  const closeAllSettings = () => {
    closeSettings();
    setShowSettingsLocal(false);
  };
  const openAllSettings = () => {
    openSettings();
    setShowSettingsLocal(true);
  };

  const title = resolveHeaderTitle(t, {
    section: nav.section,
    gameView: nav.gameView,
    profileView: nav.profileView,
  });

  const activeNav = useMemo(() => sectionToNavId(nav.section), [nav.section]);
  const pageClass = `page-content${pageContentModifier(nav.section, nav.gameView)}`;

  const onNavigate = (id: NavId) => {
    const target = navIdToSection(id);
    if (target === 'settings') {
      openAllSettings();
      return;
    }
    nav.goSection(target);
  };

  const onLogout = () => {
    logout();
    nav.reset();
  };

  const Shell = useTelegramChrome ? TelegramShell : DesktopShell;

  return (
    <div
      className={`app${session.isDesktopWeb ? ' app--desktop-web' : ''}${isDemo ? ' app--demo' : ''}`}
      data-client={client}
    >
      <Shell
        title={title}
        balanceLabel={formatBalance(balance)}
        userName={displayName || user?.username || 'Player'}
        userAvatar={user?.photo_url}
        activeNav={activeNav}
        onNavigate={onNavigate}
        onDeposit={() => nav.goSection('wallet')}
        onLogout={onLogout}
        onSettings={openAllSettings}
      >
        {isDemo && (
          <div className="demo-banner" role="status">
            <span className="demo-banner-label">{t.demo.label}</span>
            <span className="demo-banner-hint">{t.demo.hint}</span>
          </div>
        )}
        {error && <div className="error-banner">{error}</div>}
        <div className={`${pageClass}${session.isDesktopWeb ? ' desk-page' : ''}`}>
          <AppMainContent session={session} nav={nav} />
        </div>
      </Shell>

      {settingsOpen && <SettingsModal onClose={closeAllSettings} />}
    </div>
  );
}

/**
 * Боевой UI на новом shell-слое: реальные игры / кошелёк / награды / кабинет.
 * Авторизация и API — через useAppSession (как в старом App).
 */
export function ShellLiveApp({ force }: { force?: Platform }) {
  const session = useAppSession();

  return (
    <PlatformProvider force={force}>
      <LiveAuthGate session={session}>
        <ShellLiveInner session={session} force={force} />
      </LiveAuthGate>
    </PlatformProvider>
  );
}
