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
  { id: 'daily', icon: '🎁', label: 'Бонусы' },
  { id: 'cabinet', icon: '👤', label: 'Кабинет' },
  { id: 'wallet', icon: '💰', label: 'Кошелёк' },
];

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

function useSidebarState() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('proto-sidebar-collapsed') === 'true';
  });

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('proto-sidebar-collapsed', String(next));
      return next;
    });
  };

  return { collapsed, toggle };
}

export function ProtoApp() {
  const isDesktop = useIsDesktop();
  const { collapsed, toggle: toggleSidebar } = useSidebarState();
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

  // Desktop layout
  if (isDesktop) {
    return (
      <div className={`proto-desktop${collapsed ? ' sidebar-collapsed' : ''}`}>
        {/* Sidebar - primary navigation */}
        <aside className="proto-sidebar">
          <div className="proto-sidebar-header">
            <button 
              type="button" 
              className="proto-sidebar-toggle"
              onClick={toggleSidebar}
              title={collapsed ? 'Развернуть' : 'Свернуть'}
            >
              {collapsed ? '☰' : '✕'}
            </button>
            {!collapsed && (
              <>
                <span className="proto-sidebar-logo">✦</span>
                <span className="proto-sidebar-title">Metaluck</span>
              </>
            )}
          </div>
          
          <nav className="proto-sidebar-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`proto-sidebar-item${activeNav === item.id ? ' active' : ''}`}
                onClick={() => setActiveNav(item.id)}
                title={collapsed ? item.label : undefined}
              >
                <span className="proto-sidebar-item-icon">{item.icon}</span>
                {!collapsed && <span className="proto-sidebar-item-label">{item.label}</span>}
              </button>
            ))}
          </nav>
          
          {!collapsed && (
            <div className="proto-sidebar-footer">
              <div className="proto-sidebar-promo">
                <div className="proto-sidebar-promo-icon">🎰</div>
                <div className="proto-sidebar-promo-text">
                  <div className="proto-sidebar-promo-title">Бонус 100%</div>
                  <div className="proto-sidebar-promo-sub">на первый депозит</div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main area - fills remaining width */}
        <div className="proto-main">
          {/* Top bar - chrome only (no section nav, just balance/user) */}
          <header className="proto-topbar">
            <div className="proto-topbar-left">
              {collapsed && (
                <div className="proto-topbar-brand">
                  <span className="proto-topbar-logo">✦</span>
                  <span className="proto-topbar-title">Metaluck</span>
                </div>
              )}
            </div>
            
            <div className="proto-topbar-right">
              {/* Balance + Deposit */}
              <div className="proto-balance-box">
                <div className="proto-balance-amount">
                  <span className="proto-balance-star">★</span>
                  <span className="proto-balance-value">{balance.toLocaleString('ru-RU')}</span>
                </div>
                <button type="button" className="proto-deposit-btn">
                  Депозит
                </button>
              </div>
              
              {/* User */}
              <button 
                type="button" 
                className={`proto-user-btn${activeNav === 'cabinet' ? ' active' : ''}`}
                onClick={() => setActiveNav('cabinet')}
              >
                <span className="proto-user-avatar">🦊</span>
                <span className="proto-user-name">Марк</span>
                {verificationStatus === 'verified' && (
                  <span className="proto-user-verified">✓</span>
                )}
              </button>
            </div>
          </header>

          {/* Content - scrolls page */}
          <div className="proto-content">
            {renderPage()}
          </div>
        </div>

        {/* Case modal */}
        {openingCase && (
          <CaseOpenModal caseData={openingCase} onClose={handleCloseCase} />
        )}
      </div>
    );
  }

  // Mobile layout
  return (
    <div className="proto-mobile">
      {/* Mobile top bar */}
      <header className="proto-topbar-mobile">
        <div className="proto-logo">
          <span className="proto-logo-mark">✦</span>
          <span className="proto-logo-text">Metaluck</span>
        </div>
        <div className="proto-balance-pill">
          <span className="star">★</span>
          <span>{balance.toLocaleString('ru-RU')}</span>
        </div>
      </header>

      {/* Content */}
      <div className="proto-content">
        {renderPage()}
      </div>

      {/* Bottom tabs */}
      <nav className="proto-nav-mobile">
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
      </nav>

      {/* Case modal */}
      {openingCase && (
        <CaseOpenModal caseData={openingCase} onClose={handleCloseCase} />
      )}
    </div>
  );
}
