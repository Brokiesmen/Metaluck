/** Shared transport contract — the client never decides a real payout. */

export const RoundPhase = {
  IDLE: 'IDLE',
  COUNTDOWN: 'COUNTDOWN',
  FLIGHT: 'FLIGHT',
  CRASH: 'CRASH',
  RESULT: 'RESULT',
  NEXT_ROUND: 'NEXT_ROUND',
} as const;

export type RoundPhase = (typeof RoundPhase)[keyof typeof RoundPhase];

export interface RoundSnapshot {
  roundId: string;
  phase: RoundPhase;
  multiplier: number;
  /** Seconds left in the betting window (COUNTDOWN only). */
  countdown: number;
  crashAt: number | null;
  startedAt: number | null;
  crashedAt: number | null;
}

export interface BalanceSnapshot {
  balance: number;
  currency: string;
}

export interface ActiveBet {
  betId: string;
  roundId: string;
  amount: number;
  autoCashout: number | null;
  cashedOut: boolean;
  cashoutMultiplier: number | null;
  payout: number | null;
  status: 'pending' | 'active' | 'cashed_out' | 'lost' | 'rejected';
}

export interface BetRequest {
  amount: number;
  autoCashout?: number | null;
  currency?: string;
}

export interface CashoutRequest {
  betId: string;
}

/** Betting rules the UI must respect — supplied by whoever owns the round. */
export interface TransportConfig {
  /** Discrete stake sizes; when set the amount input snaps to them. */
  allowedBets: number[];
  minBet: number;
  maxBet: number;
  /** Length of the betting window, for the wait meter. */
  countdownSeconds: number;
  /** Wallet currencies the player may stake with (empty hides the row). */
  currencies: string[];
  /** Currency the balance readout is denominated in. */
  balanceCurrency: string;
}

export interface BetAcceptedEvent {
  type: 'bet_accepted';
  bet: ActiveBet;
  balance: BalanceSnapshot;
}

export interface BetRejectedEvent {
  type: 'bet_rejected';
  reason: string;
}

export interface CashoutResultEvent {
  type: 'cashout_result';
  bet: ActiveBet;
  balance: BalanceSnapshot;
}

export interface RoundUpdateEvent {
  type: 'round_update';
  round: RoundSnapshot;
}

export interface BalanceUpdateEvent {
  type: 'balance_update';
  balance: BalanceSnapshot;
}

export interface HistoryEntry {
  roundId: string;
  crashAt: number;
  timestamp: number;
}

export interface HistoryUpdateEvent {
  type: 'history_update';
  history: HistoryEntry[];
}

export type TransportEvent =
  | RoundUpdateEvent
  | BalanceUpdateEvent
  | BetAcceptedEvent
  | BetRejectedEvent
  | CashoutResultEvent
  | HistoryUpdateEvent;

export type TransportListener = (event: TransportEvent) => void;
