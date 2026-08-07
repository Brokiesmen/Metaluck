/** Общий UI-слой: два shell'а (telegram/desktop) на одном конфиге навигации. */
export { PlatformProvider, usePlatform, detectPlatform, type Platform } from './PlatformProvider';
export { navItems, navLabel, type NavItem, type NavId } from './navItems';
export { AppShell } from './AppShell';
export { TelegramShell } from './TelegramShell';
export { DesktopShell } from './DesktopShell';
export { Sidebar } from './Sidebar';
export { BottomNav } from './BottomNav';
export { TopBar } from './TopBar';
export { PageHeader } from './PageHeader';
export { SectionHeader } from './SectionHeader';
export { StatCard } from './StatCard';
export { GameCard } from './GameCard';
export { BalanceCard } from './BalanceCard';
export { RewardCard } from './RewardCard';
export { SettingRow } from './SettingRow';
export { EmptyState } from './EmptyState';
export { ShellDemo } from './ShellDemo';
