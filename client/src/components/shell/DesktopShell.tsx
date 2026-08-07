import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

/** Desktop shell: Sidebar слева, TopBar + контент справа. */
interface Props {
  title: string;
  children: ReactNode;
}

export function DesktopShell({ title, children }: Props) {
  return (
    <div className="sh-shell sh-shell--desktop">
      <Sidebar />
      <div className="sh-shell-main">
        <TopBar title={title} />
        <main className="sh-content sh-content--desktop">{children}</main>
      </div>
    </div>
  );
}
