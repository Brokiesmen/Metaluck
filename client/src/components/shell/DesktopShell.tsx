import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import type { NavId } from './navItems';

/** Desktop shell: Sidebar слева, TopBar + контент справа. */
interface Props {
  active: NavId;
  title: string;
  onNavigate: (id: NavId) => void;
  children: ReactNode;
}

export function DesktopShell({ active, title, onNavigate, children }: Props) {
  return (
    <div className="sh-shell sh-shell--desktop">
      <Sidebar active={active} onNavigate={onNavigate} />
      <div className="sh-shell-main">
        <TopBar title={title} />
        <main className="sh-content sh-content--desktop">{children}</main>
      </div>
    </div>
  );
}
