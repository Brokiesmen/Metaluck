import { Outlet, useLocation } from 'react-router-dom';
import { usePlatform } from './PlatformProvider';
import { TelegramShell } from './TelegramShell';
import { DesktopShell } from './DesktopShell';
import { titleForPath } from './navItems';

/**
 * Layout общего UI-слоя: выбирает shell по платформе и рендерит текущий роут.
 * Страницы (Outlet) НЕ знают о платформе — desktop/mobile разводят только shell'ы.
 */
export function AppShell() {
  const { isTelegram } = usePlatform();
  const { pathname } = useLocation();
  const title = titleForPath(pathname);
  const Shell = isTelegram ? TelegramShell : DesktopShell;
  return (
    <Shell title={title}>
      <Outlet />
    </Shell>
  );
}
