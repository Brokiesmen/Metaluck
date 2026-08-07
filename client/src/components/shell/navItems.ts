/**
 * Единый конфиг навигации. Один источник для Sidebar (desktop) и BottomNav (telegram).
 */
export type NavId = 'dashboard' | 'profile' | 'balance' | 'games' | 'rewards' | 'settings';

export interface NavItem {
  id: NavId;
  label: string;
  icon: string; // emoji-иконка (без внешних зависимостей)
}

export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'balance', label: 'Balance', icon: '💰' },
  { id: 'games', label: 'Games', icon: '🎮' },
  { id: 'rewards', label: 'Rewards', icon: '🎁' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export function navLabel(id: NavId): string {
  return navItems.find((n) => n.id === id)?.label ?? id;
}
