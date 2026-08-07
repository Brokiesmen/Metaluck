import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import type { NavId } from './navItems';

/**
 * Desktop shell: фиксированный сайдбар 260px слева, TopBar + широкий
 * адаптивный контейнер справа. Переиспользует те же shared-страницы.
 */
interface Props {
  title: string;
  children: ReactNode;
  balanceLabel?: string;
  starsBalance?: number;
  userName?: string;
  userAvatar?: string | null;
  activeNav?: NavId;
  onNavigate?: (id: NavId) => void;
  onDeposit?: () => void;
  onLogout?: () => void;
  onSettings?: () => void;
}

export function DesktopShell({
  title,
  children,
  balanceLabel,
  starsBalance,
  activeNav,
  onNavigate,
  onDeposit,
}: Props) {
  return (
    <div className="sh-shell sh-shell--desktop">
      <Sidebar activeNav={activeNav} onNavigate={onNavigate} onDeposit={onDeposit} />
      <div className="sh-shell-main">
        <TopBar
          title={title}
          balanceLabel={balanceLabel}
          starsBalance={starsBalance}
          onBalanceClick={onDeposit}
        />
        <main className="sh-content sh-content--desktop">
          <div className="sh-container">{children}</div>
        </main>
      </div>
    </div>
  );
}
