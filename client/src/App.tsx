import { LoginScreen } from './components/LoginScreen';
import { SettingsModal } from './components/SettingsModal';
import { DesktopShell } from './components/desktop/DesktopShell';
import {
  AppMainContent,
  pageContentModifier,
  resolveHeaderTitle,
  TelegramShell,
  useAppNavigation,
  useAppSession,
} from './platform';

export function App() {
  const session = useAppSession();
  const nav = useAppNavigation(session.isDesktopWeb ? 'home' : 'games');

  const {
    client,
    isDesktopWeb,
    isDemo,
    authGate,
    t,
    user,
    balance,
    showSettings,
    onWebLogin,
    logout,
    openSettings,
    closeSettings,
  } = session;

  const title = resolveHeaderTitle(t, {
    section: nav.section,
    gameView: nav.gameView,
    profileView: nav.profileView,
  });

  const pageClass = `page-content${pageContentModifier(nav.section, nav.gameView)}`;

  const onLogout = () => {
    logout();
    nav.reset();
  };

  // desktop_web без сессии → LoginScreen
  if (isDesktopWeb && authGate !== 'authed') {
    return (
      <div className="app app--login" data-client={client}>
        {authGate === 'anon' ? (
          <LoginScreen onLogin={onWebLogin} />
        ) : (
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
        )}
      </div>
    );
  }

  const main = (
    <main className={`${pageClass}${isDesktopWeb ? ' desk-page' : ''}`}>
      <AppMainContent session={session} nav={nav} />
    </main>
  );

  // ── Desktop Web ───────────────────────────────────────────────────────────
  if (isDesktopWeb) {
    return (
      <div className={`app app--desktop-web${isDemo ? ' app--demo' : ''}`} data-client={client}>
        <DesktopShell
          user={user}
          balance={balance}
          active={nav.desktopNav}
          title={title}
          onNavigate={nav.goDesktopNav}
          onSettings={openSettings}
          onLogout={onLogout}
        >
          {isDemo && (
            <div className="demo-banner" role="status">
              <span className="demo-banner-label">{t.demo.label}</span>
              <span className="demo-banner-hint">{t.demo.hint}</span>
            </div>
          )}
          {session.error && <div className="error-banner">{session.error}</div>}
          {main}
        </DesktopShell>

        {showSettings && <SettingsModal onClose={closeSettings} />}
      </div>
    );
  }

  // ── Telegram Mini App ─────────────────────────────────────────────────────
  return (
    <div className={`app${isDemo ? ' app--demo' : ''}`} data-client={client}>
      <TelegramShell session={session} nav={nav} title={title}>
        {main}
      </TelegramShell>
      {showSettings && <SettingsModal onClose={closeSettings} />}
    </div>
  );
}
