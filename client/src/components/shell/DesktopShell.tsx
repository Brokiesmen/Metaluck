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
  userName,
  userAvatar,
  activeNav,
  onNavigate,
  onDeposit,
  onSettings,
}: Props) {
  return (
    <div className="sh-shell sh-shell--desktop">
      <Sidebar activeNav={activeNav} onNavigate={onNavigate} onDeposit={onDeposit} />
      <div className="sh-shell-main">
        <TopBar
          title={title}
          balanceLabel={balanceLabel}
          userName={userName}
          userAvatar={userAvatar}
          onBalanceClick={onDeposit}
          onSettings={onSettings}
        />
        <main className="sh-content sh-content--desktop">
          <div className="sh-container">{children}</div>
        </main>
      </div>
    </div>
  );
}
