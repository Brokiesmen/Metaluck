import { useState, useEffect } from 'react';
import './proto.css';
import { CasesPage } from './pages/CasesPage';
import { GamesPage } from './pages/GamesPage';
import { DailyPage } from './pages/DailyPage';
import { ProfilePage } from './pages/ProfilePage';
import { CaseOpenModal } from './components/CaseOpenModal';
import { AuthModal } from './components/AuthModal';
import { DepositModal } from './components/DepositModal';
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

export interface Wallets {
  stars: number;
  ton: number;
  usdt: number;
}

export interface User {
  name: string;
  email: string;
  avatar: string;
}

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

function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('proto-user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('proto-user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('proto-user');
  };

  return { user, login, logout };
}

function useWallets() {
  const [wallets, setWallets] = useState<Wallets>(() => {
    if (typeof window === 'undefined') return { stars: 1240, ton: 2.5, usdt: 15.0 };
    const saved = localStorage.getItem('proto-wallets');
    return saved ? JSON.parse(saved) : { stars: 1240, ton: 2.5, usdt: 15.0 };
  });

  const deposit = (currency: keyof Wallets, amount: number) => {
    setWallets(prev => {
      const next = { ...prev, [currency]: prev[currency] + amount };
      localStorage.setItem('proto-wallets', JSON.stringify(next));
      return next;
    });
  };

  return { wallets, deposit };
}

export function ProtoApp() {
  const isDesktop = useIsDesktop();
  const { collapsed, toggle: toggleSidebar } = useSidebarState();
  const { user, login, logout } = useAuth();
  const { wallets, deposit } = useWallets();
  const [activeNav, setActiveNav] = useState<NavId>('cases');
  const [openingCase, setOpeningCase] = useState<ProtoCase | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('unverified');
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const [showDeposit, setShowDeposit] = useState(false);

  const handleOpenCase = (c: ProtoCase) => {
    setOpeningCase(c);
  };

  const handleCloseCase = () => {
    setOpeningCase(null);
  };

  const handleLogin = (userData: User) => {
    login(userData);
    setAuthModal(null);
  };

  const handleDeposit = (currency: keyof Wallets, amount: number) => {
    deposit(currency, amount);
    setShowDeposit(false);
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
            wallets={wallets}
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
        {/* Sidebar */}
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

        {/* Main area */}
        <div className="proto-main">
          {/* Top bar */}
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
              {/* Multi-wallet balances */}
              <div className="proto-wallets-bar">
                <div className="proto-wallet-item">
                  <span className="proto-wallet-icon">★</span>
                  <span className="proto-wallet-value">{wallets.stars.toLocaleString('ru-RU')}</span>
                </div>
                <div className="proto-wallet-item">
                  <span className="proto-wallet-icon">💎</span>
                  <span className="proto-wallet-value">{wallets.ton.toFixed(2)}</span>
                  <span className="proto-wallet-code">TON</span>
                </div>
                <div className="proto-wallet-item">
                  <span className="proto-wallet-icon">$</span>
                  <span className="proto-wallet-value">{wallets.usdt.toFixed(2)}</span>
                  <span className="proto-wallet-code">USDT</span>
                </div>
                <button 
                  type="button" 
                  className="proto-deposit-btn"
                  onClick={() => setShowDeposit(true)}
                >
                  Депозит
                </button>
              </div>
              
              {/* Auth / User */}
              {user ? (
                <div className="proto-user-menu">
                  <button 
                    type="button" 
                    className={`proto-user-btn${activeNav === 'cabinet' ? ' active' : ''}`}
                    onClick={() => setActiveNav('cabinet')}
                  >
                    <span className="proto-user-avatar">{user.avatar}</span>
                    <span className="proto-user-name">{user.name}</span>
                    {verificationStatus === 'verified' && (
                      <span className="proto-user-verified">✓</span>
                    )}
                  </button>
                  <button 
                    type="button" 
                    className="proto-logout-btn"
                    onClick={logout}
                    title="Выйти"
                  >
                    ⏻
                  </button>
                </div>
              ) : (
                <div className="proto-auth-btns">
                  <button 
                    type="button" 
                    className="proto-auth-btn proto-auth-btn--login"
                    onClick={() => setAuthModal('login')}
                  >
                    Войти
                  </button>
                  <button 
                    type="button" 
                    className="proto-auth-btn proto-auth-btn--register"
                    onClick={() => setAuthModal('register')}
                  >
                    Регистрация
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Content */}
          <div className="proto-content">
            {renderPage()}
          </div>
        </div>

        {/* Modals */}
        {openingCase && (
          <CaseOpenModal caseData={openingCase} onClose={handleCloseCase} />
        )}
        {authModal && (
          <AuthModal 
            mode={authModal} 
            onClose={() => setAuthModal(null)}
            onLogin={handleLogin}
            onSwitchMode={(mode) => setAuthModal(mode)}
          />
        )}
        {showDeposit && (
          <DepositModal 
            onClose={() => setShowDeposit(false)}
            onDeposit={handleDeposit}
          />
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
        
        <div className="proto-mobile-right">
          {/* Compact wallet display */}
          <button 
            type="button" 
            className="proto-balance-pill"
            onClick={() => setShowDeposit(true)}
          >
            <span className="star">★</span>
            <span>{wallets.stars.toLocaleString('ru-RU')}</span>
            <span className="proto-balance-plus">+</span>
          </button>
          
          {/* Auth / User */}
          {user ? (
            <button 
              type="button" 
              className="proto-mobile-avatar"
              onClick={() => setActiveNav('cabinet')}
            >
              {user.avatar}
            </button>
          ) : (
            <button 
              type="button" 
              className="proto-mobile-login"
              onClick={() => setAuthModal('login')}
            >
              Войти
            </button>
          )}
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

      {/* Modals */}
      {openingCase && (
        <CaseOpenModal caseData={openingCase} onClose={handleCloseCase} />
      )}
      {authModal && (
        <AuthModal 
          mode={authModal} 
          onClose={() => setAuthModal(null)}
          onLogin={handleLogin}
          onSwitchMode={(mode) => setAuthModal(mode)}
        />
      )}
      {showDeposit && (
        <DepositModal 
          onClose={() => setShowDeposit(false)}
          onDeposit={handleDeposit}
        />
      )}
    </div>
  );
}
