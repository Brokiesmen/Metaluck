import type { ReactNode } from 'react';
import { useSettings } from '../../settings/SettingsContext';
import {
  IconDashboard,
  IconGames,
  IconLeaders,
  IconLogout,
  IconProfile,
  IconRewards,
  IconSettings,
  IconWallet,
} from './desktopIcons';

export type DesktopNavId = 'dashboard' | 'profile' | 'wallet' | 'games' | 'rewards' | 'leaders';

interface Props {
  active: DesktopNavId;
  onNavigate: (id: DesktopNavId) => void;
  onSettings: () => void;
  onLogout: () => void;
}

export function DesktopSidebar({ active, onNavigate, onSettings, onLogout }: Props) {
  const { t } = useSettings();

  const items: Array<{ id: DesktopNavId; icon: ReactNode; label: string }> = [
    { id: 'dashboard', icon: <IconDashboard />, label: t.desktop.dashboard },
    { id: 'games', icon: <IconGames />, label: t.desktop.games },
    { id: 'wallet', icon: <IconWallet />, label: t.desktop.wallet },
    { id: 'rewards', icon: <IconRewards />, label: t.desktop.rewards },
    { id: 'leaders', icon: <IconLeaders />, label: t.tabs.leaders },
    { id: 'profile', icon: <IconProfile />, label: t.desktop.profile },
  ];

  return (
    <aside className="desk-sidebar" aria-label="Navigation">
      <div className="desk-brand">
        <span className="desk-brand-mark" aria-hidden />
        <span className="desk-brand-text">{t.desktop.brand}</span>
      </div>

      <nav className="desk-nav">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`desk-nav-item${active === item.id ? ' is-active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="desk-nav-icon">{item.icon}</span>
            <span className="desk-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="desk-sidebar-foot">
        <button type="button" className="desk-nav-item" onClick={onSettings}>
          <span className="desk-nav-icon">
            <IconSettings />
          </span>
          <span className="desk-nav-label">{t.desktop.settings}</span>
        </button>
        <button type="button" className="desk-nav-item desk-nav-item--danger" onClick={onLogout}>
          <span className="desk-nav-icon">
            <IconLogout />
          </span>
          <span className="desk-nav-label">{t.desktop.logout}</span>
        </button>
      </div>
    </aside>
  );
}
