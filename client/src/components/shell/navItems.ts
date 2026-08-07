/**
 * Единый конфиг навигации + маршрутов. Один источник для Sidebar, BottomNav и роутера.
 */
export type NavId = 'lobby' | 'profile' | 'balance' | 'rewards' | 'settings';

export interface NavItem {
  id: NavId;
  path: string;
  label: string;
  icon: string; // emoji (без внешних зависимостей)
}

export const navItems: NavItem[] = [
  { id: 'lobby', path: '/', label: 'Games', icon: '🎮' },
  { id: 'profile', path: '/profile', label: 'Profile', icon: '👤' },
  { id: 'balance', path: '/balance', label: 'Balance', icon: '💰' },
  { id: 'rewards', path: '/rewards', label: 'Rewards', icon: '🎁' },
  { id: 'settings', path: '/settings', label: 'Settings', icon: '⚙️' },
];

export function titleForPath(pathname: string): string {
  const exact = navItems.find((n) => n.path === pathname);
  if (exact) return exact.id === 'lobby' ? 'Games Lobby' : exact.label;
  return 'Metaluck';
}
