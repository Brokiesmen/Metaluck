import type { ReactNode } from 'react';
import { TabBar } from '../components/TabBar';
import { StarIcon } from '../components/StarIcon';
import type { AppNavigation } from './useAppNavigation';
import type { AppSession } from './useAppSession';

interface Props {
  session: AppSession;
  nav: AppNavigation;
  title: string;
  children: ReactNode;
}

/** Оболочка Telegram Mini App: header + TabBar. Контент — общий AppMainContent. */
export function TelegramShell({ session, nav, title, children }: Props) {
  const { t, locale, isDemo, balance, error, logs, openSettings } = session;
  const { tab, section, profileView, goTab, goSection, closeAdmin } = nav;

  return (
    <>
      <header className="tg-header">
        <div className="tg-header-left">
          {section === 'profile' ? (
            profileView === 'admin' ? (
              <button type="button" className="back-btn" onClick={closeAdmin}>‹</button>
            ) : (
              <button
                type="button"
                className="settings-btn"
                onClick={openSettings}
                aria-label={t.settings.ariaOpen}
              >
                ⚙️
              </button>
            )
          ) : section !== 'games' ? (
            <button type="button" className="back-btn" onClick={() => goSection('games')}>‹</button>
          ) : null}
        </div>
        <div className="tg-header-title">{title}</div>
        <div className="tg-header-right">
          {(section === 'games' || section === 'wallet') && (
            <span className="header-balance num">
              {balance.toLocaleString(locale)}
              <StarIcon size={18} />
            </span>
          )}
        </div>
      </header>

      {isDemo && (
        <div className="demo-banner" role="status">
          <span className="demo-banner-label">{t.demo.label}</span>
          <span className="demo-banner-hint">{t.demo.hint}</span>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      <div className="app-body">
        {children}
        <TabBar active={tab} onChange={goTab} />
      </div>

      {error && (
        <div style={{ padding: 10, fontSize: 10, background: '#000', color: '#0f0', maxHeight: 100, overflow: 'auto' }}>
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </>
  );
}
