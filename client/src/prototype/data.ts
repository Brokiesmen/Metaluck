export interface ProtoCase {
  id: number;
  name: string;
  icon: string;
  price: number;
  accent: string;
  badge?: 'free' | 'hot' | 'new';
  prizes: ProtoPrize[];
}

export interface ProtoPrize {
  id: number;
  name: string;
  icon: string;
  value: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface ProtoGame {
  id: string;
  name: string;
  icon: string;
  players: string;
  hot?: boolean;
}

export interface ProtoReward {
  id: string;
  title: string;
  hint: string;
  icon: string;
  status: 'available' | 'claimed' | 'locked';
}

export interface ProtoActivity {
  id: string;
  game: string;
  icon: string;
  time: string;
  amount: number;
  win: boolean;
}

export const protoCases: ProtoCase[] = [
  {
    id: 1,
    name: 'Стартовый',
    icon: '📦',
    price: 0,
    accent: '#4a9eda',
    badge: 'free',
    prizes: [
      { id: 1, name: 'Звёзды', icon: '⭐', value: 10, rarity: 'common' },
      { id: 2, name: 'Звёзды', icon: '⭐', value: 25, rarity: 'common' },
      { id: 3, name: 'Звёзды', icon: '⭐', value: 50, rarity: 'rare' },
      { id: 4, name: 'Звёзды', icon: '⭐', value: 100, rarity: 'epic' },
    ],
  },
  {
    id: 2,
    name: 'Базовый',
    icon: '🎁',
    price: 50,
    accent: '#22c55e',
    prizes: [
      { id: 1, name: 'Звёзды', icon: '⭐', value: 25, rarity: 'common' },
      { id: 2, name: 'Звёзды', icon: '⭐', value: 50, rarity: 'common' },
      { id: 3, name: 'Звёзды', icon: '⭐', value: 100, rarity: 'rare' },
      { id: 4, name: 'Звёзды', icon: '⭐', value: 250, rarity: 'epic' },
    ],
  },
  {
    id: 3,
    name: 'Премиум',
    icon: '💎',
    price: 150,
    accent: '#8b5cf6',
    badge: 'hot',
    prizes: [
      { id: 1, name: 'Звёзды', icon: '⭐', value: 75, rarity: 'common' },
      { id: 2, name: 'Звёзды', icon: '⭐', value: 150, rarity: 'rare' },
      { id: 3, name: 'Звёзды', icon: '⭐', value: 350, rarity: 'epic' },
      { id: 4, name: 'Звёзды', icon: '⭐', value: 1000, rarity: 'legendary' },
    ],
  },
  {
    id: 4,
    name: 'Золотой',
    icon: '👑',
    price: 500,
    accent: '#ffd700',
    badge: 'new',
    prizes: [
      { id: 1, name: 'Звёзды', icon: '⭐', value: 250, rarity: 'common' },
      { id: 2, name: 'Звёзды', icon: '⭐', value: 500, rarity: 'rare' },
      { id: 3, name: 'Звёзды', icon: '⭐', value: 1500, rarity: 'epic' },
      { id: 4, name: 'Звёзды', icon: '⭐', value: 5000, rarity: 'legendary' },
    ],
  },
  {
    id: 5,
    name: 'Легендарный',
    icon: '🏆',
    price: 1000,
    accent: '#ef4444',
    prizes: [
      { id: 1, name: 'Звёзды', icon: '⭐', value: 500, rarity: 'common' },
      { id: 2, name: 'Звёзды', icon: '⭐', value: 1000, rarity: 'rare' },
      { id: 3, name: 'Звёзды', icon: '⭐', value: 3000, rarity: 'epic' },
      { id: 4, name: 'Звёзды', icon: '⭐', value: 10000, rarity: 'legendary' },
    ],
  },
  {
    id: 6,
    name: 'Мистический',
    icon: '🔮',
    price: 300,
    accent: '#d946ef',
    prizes: [
      { id: 1, name: 'Звёзды', icon: '⭐', value: 150, rarity: 'common' },
      { id: 2, name: 'Звёзды', icon: '⭐', value: 300, rarity: 'rare' },
      { id: 3, name: 'Звёзды', icon: '⭐', value: 800, rarity: 'epic' },
      { id: 4, name: 'Звёзды', icon: '⭐', value: 2500, rarity: 'legendary' },
    ],
  },
];

export const protoGames: ProtoGame[] = [
  { id: 'cases', name: 'Кейсы', icon: '📦', players: '2.4k играют', hot: true },
  { id: 'aviator', name: 'Авиатор', icon: '✈️', players: '1.1k играют', hot: true },
  { id: 'coinflip', name: 'Монетка', icon: '🪙', players: '860 играют' },
  { id: 'mines', name: 'Мины', icon: '💣', players: '540 играют', hot: true },
  { id: 'wheel', name: 'Колесо', icon: '🎡', players: '430 играют' },
  { id: 'blackjack', name: 'Блэкджек', icon: '🃏', players: '390 играют' },
  { id: 'dice', name: 'Кости', icon: '🎲', players: '780 играют' },
  { id: 'plinko', name: 'Плинко', icon: '🔻', players: '610 играют' },
];

export const protoRewards: ProtoReward[] = [
  { id: 'daily', title: 'Ежедневный бонус', hint: 'Получите 50 звёзд сегодня', status: 'available', icon: '🎁' },
  { id: 'wheel', title: 'Бесплатное вращение', hint: 'Крутите колесо удачи', status: 'available', icon: '🎡' },
  { id: 'streak', title: 'Серия входов: 5 дней', hint: 'Ещё 2 дня до награды', status: 'locked', icon: '🔥' },
  { id: 'referral', title: 'Пригласите друга', hint: '+100 звёзд за приглашение', status: 'available', icon: '🤝' },
  { id: 'weekly', title: 'Недельный сундук', hint: 'Получено 2ч назад', status: 'claimed', icon: '🧰' },
];

export const protoActivity: ProtoActivity[] = [
  { id: 'a1', game: 'Авиатор', icon: '✈️', time: '2 мин назад', amount: 120, win: true },
  { id: 'a2', game: 'Мины', icon: '💣', time: '18 мин назад', amount: 40, win: false },
  { id: 'a3', game: 'Кейсы', icon: '📦', time: '1ч назад', amount: 310, win: true },
  { id: 'a4', game: 'Монетка', icon: '🪙', time: '3ч назад', amount: 25, win: false },
];

export const protoStats = {
  totalBalance: 1240,
  gamesPlayed: 312,
  winRate: '57%',
  dailyStreak: 6,
};

export const protoProfile = {
  name: 'Марк Иванов',
  handle: '@markivanov',
  avatar: '🦊',
  level: 12,
  joined: 'С марта 2026',
};

export const protoWallets = [
  { code: 'STARS', name: 'Telegram Stars', amount: '1 240', fiat: '≈ $18.60', icon: '⭐' },
  { code: 'TON', name: 'Toncoin', amount: '3.42', fiat: '≈ $17.10', icon: '💎' },
  { code: 'USDT', name: 'Tether (TON)', amount: '25.00', fiat: '≈ $25.00', icon: '₮' },
];

export const protoWheelSegments = [
  { id: 1, label: '10 ★', color: '#2563eb' },
  { id: 2, label: '25 ★', color: '#7c3aed' },
  { id: 3, label: '50 ★', color: '#059669' },
  { id: 4, label: '💀', color: '#dc2626' },
  { id: 5, label: '100 ★', color: '#d97706' },
  { id: 6, label: '🎟️', color: '#be185d' },
  { id: 7, label: '200 ★', color: '#0891b2' },
  { id: 8, label: '💀', color: '#dc2626' },
];
