import type { ReactNode } from 'react';
import { usePlatform } from './PlatformProvider';
import { TelegramShell } from './TelegramShell';
import { DesktopShell } from './DesktopShell';
import type { NavId } from './navItems';

interface Props {
  active: NavId;
  title: string;
  onNavigate: (id: NavId) => void;
  children: ReactNode;
}

/**
 * Единый вход в UI-слой: выбирает shell по платформе.
 * Оба shell'а получают одинаковый интерфейс (active/title/onNavigate/children).
 */
export function AppShell({ active, title, onNavigate, children }: Props) {
  const { isTelegram } = usePlatform();
  const Shell = isTelegram ? TelegramShell : DesktopShell;
  return (
    <Shell active={active} title={title} onNavigate={onNavigate}>
      {children}
    </Shell>
  );
}
