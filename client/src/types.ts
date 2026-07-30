export type Rarity = 'gray' | 'blue' | 'purple' | 'gold';

export interface GiftImage {
  image: string;
  animated?: string;
}

export interface Prize {
  id: number;
  name: string;
  rarity: Rarity;
  icon: string;
  stars?: number;  // set for star prizes
  isPremium?: boolean;
}

export interface Leader {
  userId: number;
  name: string;
  balance: number;
  photoUrl?: string;
}

export interface Case {
  id: number;
  name: string;
  price: number;
  icon: string;
  color: string;
  isFree?: boolean;
  paidFallbackPrice?: number;
  freeAvailable?: boolean;
  nextFreeAt?: number | null;
}

export interface RarityConfig {
  label: string;
  bg: string;
  text: string;
  border: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface HistoryEntry {
  caseId: number;
  caseName: string;
  prize: Prize;
  timestamp: number;
}

export interface TopupPackage {
  id: string;
  xtrAmount: number;
  balanceAmount: number;
  label: string;
  popular: boolean;
}

export interface LeaderPage {
  leaders: Leader[];
  pagination: { page: number; limit: number; total: number; hasMore: boolean };
}

export interface HistoryPage {
  history: HistoryEntry[];
  pagination: { page: number; limit: number; total: number; hasMore: boolean };
}

export interface BlackjackPublicCard {
  code: string;
  label: string;
  faceDown?: boolean;
}

export interface BlackjackRound {
  phase: 'player' | 'finished';
  bet: number;
  playerCards: BlackjackPublicCard[];
  playerValue: number;
  dealerCards: BlackjackPublicCard[];
  /** Полная сумма руки дилера, когда все карты открыты */
  dealerValue: number | null;
  /** Сумма только открытой карты, пока вторая закрыта */
  dealerUpcardValue?: number | null;
  result: 'win' | 'lose' | 'push' | 'blackjack' | 'bust' | null;
  payout: number;
}

export interface BlackjackStateResponse {
  newBalance: number;
  round: BlackjackRound | null;
}

export type CoinSide = 'heads' | 'tails';

export interface CoinflipResult {
  newBalance: number;
  bet: number;
  choice: CoinSide;
  result: CoinSide;
  win: boolean;
  payout: number;
}

export type MineRushDifficulty = 'easy' | 'medium' | 'hard';
export type MineRushStatus = 'active' | 'lost' | 'won' | 'cashed';

export interface MineRushCell {
  key: string;
  state: 'hidden' | 'number' | 'mine';
  value?: number;
}

export interface MineRushGameView {
  gameId: string;
  bet: number;
  difficulty: MineRushDifficulty;
  status: MineRushStatus;
  score: number;
  balance: number;
  mineCount: number;
  gridSize: number;
  flags: string[];
  cells: MineRushCell[];
  startedAt: number;
}

export interface MineRushRevealResult extends MineRushGameView {
  exploded?: string | null;
}

export interface MineRushCashoutResult extends MineRushGameView {
  payout: number;
}

// ── Arena (общий джекпот) ────────────────────────────────────────

export type ArenaPhase = 'betting' | 'spinning' | 'finished';

export interface ArenaPlayerView {
  userId: number;
  name: string;
  bet: number;
  color: string;
  share: number;
  startDeg: number;
  endDeg: number;
  isBot: boolean;
  isMe: boolean;
}

export interface ArenaRoundView {
  roundId: string;
  phase: ArenaPhase;
  pot: number;
  bettingEndsAt: number;
  spinEndsAt: number;
  players: ArenaPlayerView[];
  myBet: number;
  winnerAngleDeg: number | null;
  winner: { userId: number; name: string; color: string; isMe: boolean } | null;
  payout: number;
}

export interface ArenaStateResponse {
  round: ArenaRoundView | null;
  balance: number;
  now: number;
}
