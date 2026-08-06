import type { ReactNode } from 'react';
import type { TelegramUser } from '../../types';
import { DesktopSidebar, type DesktopNavId } from './DesktopSidebar';
import { DesktopTopBar } from './DesktopTopBar';

interface Props {
  user: TelegramUser;
  balance: number;
  active: DesktopNavId;
  title: string;
  onNavigate: (id: DesktopNavId) => void;
  onSettings: () => void;
  onLogout: () => void;
  children: ReactNode;
}

export function DesktopShell({
  user,
  balance,
  active,
  title,
  onNavigate,
  onSettings,
  onLogout,
  children,
}: Props) {
  return (
    <div className="desk-shell">
      <DesktopSidebar
        active={active}
        onNavigate={onNavigate}
        onSettings={onSettings}
        onLogout={onLogout}
      />
      <div className="desk-main">
        <DesktopTopBar user={user} balance={balance} title={title} />
        <div className="desk-content">{children}</div>
      </div>
    </div>
  );
}

export type { DesktopNavId };
