import type { ReactNode } from 'react';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import type { NavId } from './navItems';

interface Props {
  active: NavId;
  title: string;
  onNavigate: (id: NavId) => void;
  children: ReactNode;
}

/** Мобильный shell: TopBar сверху, контент, BottomNav снизу. */
export function TelegramShell({ active, title, onNavigate, children }: Props) {
  return (
    <div className="sh-shell sh-shell--telegram">
      <TopBar title={title} />
      <main className="sh-content sh-content--telegram">{children}</main>
      <BottomNav active={active} onNavigate={onNavigate} />
    </div>
  );
}
