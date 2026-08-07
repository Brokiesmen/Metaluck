import type { ReactNode } from 'react';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { useTelegramWebApp } from './telegram';

interface Props {
  title: string;
  children: ReactNode;
}

/**
 * Мобильный shell (desktop его не использует — AppShell выбирает DesktopShell).
 * Компактный header + нижняя навигация + safe-area + инициализация Telegram SDK.
 */
export function TelegramShell({ title, children }: Props) {
  // Client-only: ready → expand → theme/viewport/safe-area. No-op вне Telegram.
  useTelegramWebApp();

  return (
    <div className="sh-shell sh-shell--telegram">
      <TopBar title={title} compact />
      <main className="sh-content sh-content--telegram">{children}</main>
      <BottomNav />
    </div>
  );
}
