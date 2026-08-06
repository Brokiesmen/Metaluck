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
  coupons?: number;
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

// ── Aviator (crash) ──────────────────────────────────────────────

export type AviatorPhase = 'betting' | 'flying' | 'crashed';

export interface AviatorPlayerView {
  userId: number;
  name: string;
  bet: number;
  color: string;
  isBot: boolean;
  autoCashout: number | null;
  cashedOutMult: number | null;
  payout: number;
  isMe: boolean;
}

export interface AviatorConfig {
  allowedBets: number[];
  maxTotalBetPerPlayer: number;
  minCashout: number;
  maxCrash: number;
  bettingWindowMs: number;
}

export interface AviatorRoundView {
  roundId: string;
  phase: AviatorPhase;
  /** Момент старта полёта (серверное время) или null вне фазы flying. */
  startedAt: number | null;
  bettingEndsAt: number | null;
  nextRoundAt: number | null;
  multiplier: number;
  /** Точка краша — не null только в фазе crashed. */
  crashMultiplier: number | null;
  players: AviatorPlayerView[];
  myBet: number;
  myAutoCashout: number | null;
  myCashedOutMult: number | null;
  myPayout: number;
  history: number[];
  config: AviatorConfig;
}

export interface AviatorStateResponse {
  round: AviatorRoundView | null;
  balance: number;
  config: AviatorConfig;
  history: number[];
  now: number;
}

export interface AviatorBetResponse {
  round: AviatorRoundView;
  balance: number;
  now: number;
}

export interface AviatorCashoutResponse {
  round: AviatorRoundView;
  balance: number;
  payout: number;
  multiplier: number;
  now: number;
}

// ── Web auth (Google / Telegram Login вне Mini App) ──────────────
export interface WebUser {
  id: number;
  telegramId: number | null;
  googleId: string | null;
  email: string | null;
  username: string | null;
  avatar: string | null;
  authProvider: 'telegram' | 'google';
}

export interface AuthResponse {
  token: string;
  user: WebUser;
}

export type ProgressTaskId =
  | 'daily_login'
  | 'open_case'
  | 'open_paid_case'
  | 'claim_daily'
  | 'play_coinflip'
  | 'play_blackjack'
  | 'play_minerush'
  | 'play_arena'
  | 'play_aviator'
  | 'win_game'
  | 'win_coinflip'
  | 'win_blackjack'
  | 'win_minerush'
  | 'win_arena'
  | 'win_aviator';

export interface ProgressTask {
  id: ProgressTaskId | string;
  done: boolean;
}

export interface ProgressView {
  level: number;
  xp: number;
  xpForNextLevel: number;
  totalXp: number;
  xpGained?: number;
  leveledUp?: boolean;
  /** When daily tasks refresh (ms epoch). */
  tasksResetAt?: number;
  tasks: ProgressTask[];
}

/** Wallet Service (Payment Hub) */
export type WalletCurrency = 'STARS' | 'TON' | 'USDT_TON';

export interface WalletCurrencyInfo {
  code: WalletCurrency;
  kind: 'internal' | 'crypto' | 'fiat_rail';
  decimals: number;
  network: string | null;
  displaySymbol: string;
  canDeposit: boolean;
  canWithdraw: boolean;
  canExchange: boolean;
  canWager: boolean;
}

export interface WalletBalance {
  currency: WalletCurrency;
  available: number;
  locked: number;
  decimals: number;
  displaySymbol: string;
}

export interface WalletSnapshot {
  userId: number;
  balances: WalletBalance[];
  /** STARS available — same as GET /api/balance */
  balance: number;
}

export interface WalletLedgerEntry {
  id: number;
  userId: number;
  currency: WalletCurrency;
  direction: 'credit' | 'debit';
  amount: number;
  availableAfter: number;
  lockedAfter: number;
  entryType: string;
  idempotencyKey: string | null;
  refTable: string | null;
  refId: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface WalletLedgerPage {
  entries: WalletLedgerEntry[];
  pagination: {
    page: number;
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

/** Deposit Service (Payment Hub) */
export type DepositRail = 'telegram_stars' | 'ton' | 'usdt_ton';
export type DepositStatus = 'pending' | 'confirming' | 'paid' | 'failed' | 'expired';

export interface DepositMethod {
  rail: DepositRail;
  currency: WalletCurrency;
  label: string;
  network: string | null;
  decimals: number;
  minAmount: number;
  enabled: boolean;
  hint: string;
}

export interface DepositOrderView {
  id: string;
  rail: DepositRail;
  currency: WalletCurrency;
  productKind: 'wallet_credit' | 'premium_wheel';
  status: DepositStatus;
  expectedAmount: number;
  receivedAmount: number | null;
  confirmations: number;
  requiredConfirmations: number;
  depositAddress: string | null;
  memo: string | null;
  packageId: string | null;
  invoiceLink?: string | null;
  expiresAt: string | null;
  createdAt: string;
  newBalance?: number | null;
}

/** Per-user TON deposit address (Crypto Deposit System). */
export interface CryptoDepositAddress {
  network: 'ton';
  address: string;
  addressRaw: string;
  currency: 'TON' | 'USDT_TON';
  decimals: number;
  minAmount: number;
  symbol: string;
  currencies: Array<{
    code: 'TON' | 'USDT_TON';
    decimals: number;
    minAmount: number;
    symbol: string;
  }>;
  requiredConfirmations: number;
  memoHint: string | null;
  createdAt: string;
  instructions: string;
}

export type CryptoDepositStatus = 'pending' | 'confirmed' | 'failed';

export interface CryptoChainDeposit {
  id: string;
  currency: 'TON' | 'USDT_TON';
  network: string;
  amount: number;
  txHash: string;
  confirmations: number;
  requiredConfirmations: number;
  status: CryptoDepositStatus | string;
  detectedAt: string;
  creditedAt: string | null;
  errorMessage?: string | null;
}

export type CryptoWithdrawStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface CryptoWithdrawQuote {
  currency: 'TON' | 'USDT_TON';
  network: 'ton';
  toAddress: string;
  amount: number;
  networkFee: number;
  netAmount: number;
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
  available: number;
  decimals: number;
  symbol: string;
  canAfford: boolean;
}

export interface CryptoWithdrawal {
  id: string;
  currency: 'TON' | 'USDT_TON';
  network: 'ton';
  toAddress: string;
  amount: number;
  networkFee: number;
  netAmount: number;
  status: CryptoWithdrawStatus;
  txHash: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

/** Exchange / Market Rates */
export interface MarketRate {
  base: WalletCurrency;
  quote: WalletCurrency;
  mid: number;
  bid: number;
  ask: number;
  spreadBps: number;
  source: string;
  fetchedAt: string;
}

export interface ExchangePairInfo {
  from: WalletCurrency;
  to: WalletCurrency;
  spreadBps: number;
  feeBps: number;
  minFromAmount: number;
  maxFromAmount: number;
  decimalsFrom: number;
  decimalsTo: number;
}

export interface ExchangeQuote {
  quoteId: string;
  from: WalletCurrency;
  to: WalletCurrency;
  fromAmount: number;
  toAmount: number;
  feeAmount: number;
  feeCurrency: WalletCurrency;
  midRate: number;
  effectiveRate: number;
  spreadBps: number;
  feeBps: number;
  expiresAt: string;
  createdAt: string;
}

export interface ExchangeOrder {
  id: number;
  quoteId: string;
  userId: number;
  fromCurrency: WalletCurrency | string;
  toCurrency: WalletCurrency | string;
  fromAmount: number;
  toAmount: number;
  feeAmount: number;
  feeCurrency: WalletCurrency | string;
  effectiveRate: number;
  createdAt: string;
}

export interface ExchangeExecuteResult {
  order: ExchangeOrder;
  balances: WalletBalance[];
}
