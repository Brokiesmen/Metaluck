/**
 * Round data contract for Aviator UI.
 * LocalRoundSource (demo) implements this today;
 * a future LiveRoundSource (REST/WS) can swap in without touching GameScene.
 */

export type AviatorPhase = 'waiting' | 'flying' | 'crashed';

export interface RoundSnapshot {
  phase: AviatorPhase;
  roundId: string;
  multiplier: number;
  crashMult: number;
  bettingEndsAt: number;
  startedAt: number;
  crashedAt: number;
  nextRoundAt: number;
  history: number[];
  balance: number;
  selectedBet: number;
  stake: number;
  hasBet: boolean;
  cashedOut: boolean;
  cashedOutMult: number | null;
  payout: number;
  canBet: boolean;
  canCashout: boolean;
}

export type RoundListener = (snap: RoundSnapshot) => void;

export type PlaceBetResult =
  | { ok: true }
  | { ok: false; reason: string };

export type CashoutResult =
  | { ok: true; payout: number; mult: number }
  | { ok: false; reason: string };

/**
 * Transport-agnostic round controller used by GameScene.
 */
export interface RoundSource {
  subscribe(fn: RoundListener): () => void;
  start(now?: number): void;
  tick(now?: number): RoundSnapshot;
  setSelectedBet(bet: number): void;
  placeBet(): PlaceBetResult;
  cashout(): CashoutResult;
  getBalance(): number;
  snapshot(now?: number): RoundSnapshot;
  /** Optional teardown for WS sockets / timers. */
  destroy?(): void;
}
