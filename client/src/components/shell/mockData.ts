/** Статические placeholder-данные для общего UI-слоя (без бэкенда). */

export interface StatMock {
  id: string;
  label: string;
  value: string;
  delta?: string;
  icon: string;
}

export interface GameMock {
  id: string;
  title: string;
  icon: string;
  subtitle: string;
  hot?: boolean;
}

export interface BalanceMock {
  code: string;
  name: string;
  amount: string;
  fiat: string;
  icon: string;
}

export interface RewardMock {
  id: string;
  title: string;
  hint: string;
  status: 'available' | 'claimed' | 'locked';
  icon: string;
}

export interface SettingMock {
  id: string;
  label: string;
  hint?: string;
  kind: 'toggle' | 'link';
  value?: boolean;
}

export const mockProfile = {
  name: 'Mark Evans',
  handle: '@markevans',
  avatar: '🦊',
  level: 12,
  joined: 'Joined Mar 2026',
};

export const mockCategories = ['Lobby', 'Originals', 'Slots', 'Live', 'New', 'Table'];

export const mockStats: StatMock[] = [
  { id: 'balance', label: 'Total balance', value: '1 240 ★', delta: '+8.2%', icon: '💎' },
  { id: 'played', label: 'Games played', value: '312', delta: '+14', icon: '🎮' },
  { id: 'wins', label: 'Win rate', value: '57%', delta: '+3%', icon: '📈' },
  { id: 'streak', label: 'Daily streak', value: '6 days', icon: '🔥' },
];

export const mockGames: GameMock[] = [
  { id: 'cases', title: 'Cases', icon: '📦', subtitle: '2.4k playing', hot: true },
  { id: 'aviator', title: 'Aviator', icon: '✈️', subtitle: '1.1k playing', hot: true },
  { id: 'coinflip', title: 'Coinflip', icon: '🪙', subtitle: '860 playing' },
  { id: 'mines', title: 'Mine Rush', icon: '💣', subtitle: '540 playing', hot: true },
  { id: 'wheel', title: 'Fortune Wheel', icon: '🎡', subtitle: '430 playing' },
  { id: 'blackjack', title: 'Blackjack', icon: '🃏', subtitle: '390 playing' },
  { id: 'dice', title: 'Dice', icon: '🎲', subtitle: '780 playing' },
  { id: 'plinko', title: 'Plinko', icon: '🔻', subtitle: '610 playing' },
];

export const mockBalances: BalanceMock[] = [
  { code: 'STARS', name: 'Telegram Stars', amount: '1 240', fiat: '≈ $18.60', icon: '★' },
  { code: 'TON', name: 'Toncoin', amount: '3.42', fiat: '≈ $17.10', icon: '💎' },
  { code: 'USDT', name: 'Tether (TON)', amount: '25.00', fiat: '≈ $25.00', icon: '₮' },
];

export const mockRewards: RewardMock[] = [
  { id: 'daily', title: 'Daily bonus', hint: 'Claim 50 ★ today', status: 'available', icon: '🎁' },
  { id: 'wheel', title: 'Free wheel spin', hint: 'Ready to spin', status: 'available', icon: '🎡' },
  { id: 'referral', title: 'Invite a friend', hint: '+100 ★ per invite', status: 'locked', icon: '🤝' },
  { id: 'weekly', title: 'Weekly chest', hint: 'Claimed 2h ago', status: 'claimed', icon: '🧰' },
];

export const mockSettings: SettingMock[] = [
  { id: 'notifications', label: 'Push notifications', hint: 'Wins, bonuses, events', kind: 'toggle', value: true },
  { id: 'sound', label: 'Sound effects', kind: 'toggle', value: false },
  { id: 'hideZero', label: 'Hide zero balances', kind: 'toggle', value: true },
  { id: 'language', label: 'Language', hint: 'English', kind: 'link' },
  { id: 'theme', label: 'Theme', hint: 'Dark', kind: 'link' },
  { id: 'wallet', label: 'Linked wallets', hint: 'TON, EVM', kind: 'link' },
  { id: 'about', label: 'About Metaluck', kind: 'link' },
];

export interface ActivityMock {
  id: string;
  game: string;
  icon: string;
  when: string;
  amount: string;
  win: boolean;
}

export const mockActivity: ActivityMock[] = [
  { id: 'a1', game: 'Aviator', icon: '✈️', when: '2m ago', amount: '+120 ★', win: true },
  { id: 'a2', game: 'Mine Rush', icon: '💣', when: '18m ago', amount: '-40 ★', win: false },
  { id: 'a3', game: 'Cases', icon: '📦', when: '1h ago', amount: '+310 ★', win: true },
  { id: 'a4', game: 'Coinflip', icon: '🪙', when: '3h ago', amount: '-25 ★', win: false },
];
