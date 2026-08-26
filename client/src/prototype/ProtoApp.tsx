import { useState } from 'react';
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

export function ProtoApp() {
  const [activeNav, setActiveNav] = useState<NavId>('cases');
  const [balance] = useState(1240);
  const [openingCase, setOpeningCase] = useState<ProtoCase | null>(null);

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
        return <ProfilePage view={activeNav} />;
      default:
        return <CasesPage onOpenCase={handleOpenCase} />;
    }
  };

  return (
    <div className="proto-shell">
      {/* Top bar */}
      <header className="proto-topbar">
        <div className="proto-brand">
          <span className="proto-brand-mark">✦</span>
          <span className="proto-brand-name">Metaluck</span>
        </div>
        <div className="proto-balance">
          <span className="proto-balance-star">★</span>
          <span>{balance.toLocaleString('ru-RU')}</span>
        </div>
      </header>

      {/* Main content */}
      <main className="proto-main">
        <div className="proto-content">
          {renderPage()}
        </div>
      </main>

      {/* Bottom navigation */}
      <nav className="proto-bottomnav">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`proto-nav-item${activeNav === item.id ? ' proto-nav-item--active' : ''}`}
            onClick={() => setActiveNav(item.id)}
          >
            <span className="proto-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Case opening modal */}
      {openingCase && (
        <CaseOpenModal caseData={openingCase} onClose={handleCloseCase} />
      )}
    </div>
  );
}
