import type { ReactNode } from 'react';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

interface Props {
  title: string;
  children: ReactNode;
}

/** Мобильный shell: TopBar сверху, контент, BottomNav снизу. */
export function TelegramShell({ title, children }: Props) {
  return (
    <div className="sh-shell sh-shell--telegram">
      <TopBar title={title} />
      <main className="sh-content sh-content--telegram">{children}</main>
      <BottomNav />
    </div>
  );
}
