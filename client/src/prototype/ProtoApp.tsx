import { useState, useEffect } from 'react';
import './proto.css';
import { CasesPage } from './pages/CasesPage';
import { GamesPage } from './pages/GamesPage';
import { DailyPage } from './pages/DailyPage';
import { ProfilePage } from './pages/ProfilePage';
import { CaseOpenModal } from './components/CaseOpenModal';
import type { ProtoCase } from './data';

type NavId = 'cases' | 'games' | 'daily' | 'cabinet' | 'wallet';

const navItems: { id: NavId; icon: string; label: string }[] = [
  { id: 'cases', icon: '📦', label: 'Кейсы' },
  { id: 'games', icon: '🎮', label: 'Игры' },
  { id: 'daily', icon: '🎁', label: 'Ежедневки' },
  { id: 'cabinet', icon: '👤', label: 'Кабинет' },
  { id: 'wallet', icon: '💰', label: 'Кошелёк' },
];

const pageTitles: Record<NavId, string> = {
  cases: 'Кейсы',
  games: 'Игры',
  daily: 'Ежедневки',
  cabinet: 'Кабинет',
  wallet: 'Кошелёк',
};

export type VerificationStatus = 'unverified' | 'pending' | 'verified';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth >= 768
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    setIsDesktop(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isDesktop;
}

export function ProtoApp() {
  const isDesktop = useIsDesktop();
  const [activeNav, setActiveNav] = useState<NavId>('cases');
  const [balance] = useState(1240);
  const [openingCase, setOpeningCase] = useState<ProtoCase | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('unverified');

  const handleOpenCase = (c: ProtoCase) => {
    setOpeningCase(c);
  };

  const handleCloseCase = () => {
    setOpeningCase(null);
  };

  const renderPage = () => {
    switch (activeNav) {
      case 'cases':
        return <CasesPage onOpenCase={handleOpenCase} />;
      case 'games':
        return <GamesPage />;
      case 'daily':
        return <DailyPage />;
      case 'cabinet':
      case 'wallet':
        return (
          <ProfilePage 
            view={activeNav} 
            verificationStatus={verificationStatus}
            onVerificationChange={setVerificationStatus}
          />
        );
      default:
        return <CasesPage onOpenCase={handleOpenCase} />;
    }
  };

  return (
    <div className="proto-shell">
      {/* Desktop sidebar */}
      {isDesktop && (
        <aside className="proto-sidebar">
          <div className="proto-sidebar-header">
            <span className="proto-sidebar-logo">✦</span>
            <span className="proto-sidebar-title">Metaluck</span>
          </div>
          
          <nav className="proto-sidebar-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`proto-sidebar-item${activeNav === item.id ? ' active' : ''}`}
                onClick={() => setActiveNav(item.id)}
              >
                <span className="proto-sidebar-item-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          
          <div className="proto-sidebar-footer">
            <div className="proto-sidebar-balance">
              <div>
                <div className="proto-sidebar-balance-label">Баланс</div>
                <div className="proto-sidebar-balance-value">
                  {balance.toLocaleString('ru-RU')} <span className="star">★</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Mobile top bar */}
      {!isDesktop && (
        <header className="proto-topbar">
          <div className="proto-logo">
            <span className="proto-logo-mark">✦</span>
            <span className="proto-logo-text">Metaluck</span>
          </div>
          <div className="proto-balance-pill">
            <span className="star">★</span>
            <span>{balance.toLocaleString('ru-RU')}</span>
          </div>
        </header>
      )}

      {/* Main content area */}
      <main className="proto-main">
        {/* Desktop header */}
        {isDesktop && (
          <header className="proto-desktop-header">
            <h1 className="proto-desktop-title">{pageTitles[activeNav]}</h1>
            <div className="proto-desktop-user">
              <div>
                <div className="proto-desktop-name">Марк Иванов</div>
                <div className="proto-desktop-status">
                  {verificationStatus === 'verified' ? '✓ Верифицирован' : 
                   verificationStatus === 'pending' ? '⏳ На проверке' : 
                   '○ Не верифицирован'}
                </div>
              </div>
              <div className="proto-desktop-avatar">🦊</div>
            </div>
          </header>
        )}

        <div className="proto-content">
          {renderPage()}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      {!isDesktop && (
        <nav className="proto-nav-mobile">
          <div className="proto-nav-mobile-inner">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`proto-nav-btn${activeNav === item.id ? ' active' : ''}`}
                onClick={() => setActiveNav(item.id)}
              >
                <span className="proto-nav-icon">{item.icon}</span>
                <span className="proto-nav-label">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Case opening modal */}
      {openingCase && (
        <CaseOpenModal caseData={openingCase} onClose={handleCloseCase} />
      )}
    </div>
  );
}
