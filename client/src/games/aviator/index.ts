/**
 * Aviator (crash) — public surface of the game module.
 * The host only needs AviatorGame + the transport contract.
 */

export { AviatorGame } from './AviatorGame';
export type { AviatorOptions } from './AviatorGame';

export type { GameTransport } from './transport/GameTransport';
export { DemoTransport } from './transport/DemoTransport';
export { RoundPhase } from './transport/types';
export type {
  ActiveBet,
  BalanceSnapshot,
  BetRequest,
  CashoutRequest,
  HistoryEntry,
  RoundSnapshot,
  TransportConfig,
  TransportEvent,
  TransportListener,
} from './transport/types';

export { DEFAULT_STRINGS, resolveStrings } from './strings';
export type { AviatorStrings } from './strings';

export { AviatorTheme } from './config/theme';
export { AviatorConfig } from './config/aviatorConfig';
export { Quality } from './config/quality';
export { WAGER_CURRENCIES, isWagerCurrency } from './ui/currency';
export type { WagerCurrency } from './ui/currency';
