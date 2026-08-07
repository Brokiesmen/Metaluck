import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

/**
 * Desktop shell: фиксированный сайдбар 260px слева, TopBar + широкий
 * адаптивный контейнер справа. Переиспользует те же shared-страницы.
 */
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
        <main className="sh-content sh-content--desktop">
          <div className="sh-container">{children}</div>
        </main>
      </div>
    </div>
  );
}
