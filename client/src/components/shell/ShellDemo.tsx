import { useState } from 'react';
import './shell.css';
import { PlatformProvider, type Platform } from './PlatformProvider';
import { AppShell } from './AppShell';
import { PAGES } from './pages';
import { navLabel, type NavId } from './navItems';

/**
 * Демонстрация общего UI-слоя со статическими данными.
 * `force` позволяет превьюить конкретный shell (telegram/desktop).
 */
export function ShellDemo({ force }: { force?: Platform }) {
  const [active, setActive] = useState<NavId>('dashboard');
  const Page = PAGES[active];

  return (
    <PlatformProvider force={force}>
      <AppShell active={active} title={navLabel(active)} onNavigate={setActive}>
        <Page />
      </AppShell>
    </PlatformProvider>
  );
}
