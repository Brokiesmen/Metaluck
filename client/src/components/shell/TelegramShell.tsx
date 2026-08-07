import type { ReactNode } from 'react';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { useTelegramWebApp } from './telegram';
import type { NavId } from './navItems';

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

/**
 * Мобильный shell (desktop его не использует — AppShell выбирает DesktopShell).
 * Компактный header + нижняя навигация + safe-area + инициализация Telegram SDK.
 */
export function TelegramShell({
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
  // Client-only: ready → expand → theme/viewport/safe-area. No-op вне Telegram.
  useTelegramWebApp();

  return (
    <div className="sh-shell sh-shell--telegram">
      <TopBar
        title={title}
        compact
        balanceLabel={balanceLabel}
        userName={userName}
        userAvatar={userAvatar}
        onBalanceClick={onDeposit}
        onSettings={onSettings}
      />
      <main className="sh-content sh-content--telegram">{children}</main>
      <BottomNav activeNav={activeNav} onNavigate={onNavigate} />
    </div>
  );
}
