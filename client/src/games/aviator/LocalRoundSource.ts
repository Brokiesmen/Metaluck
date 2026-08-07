import {
  ALLOWED_BETS,
  BETTING_MS,
  CRASHED_MS,
  HISTORY_LEN,
  MIN_CASHOUT,
  generateCrashPoint,
  multiplierAt,
  payoutForCashout,
  timeToReachMs,
  type AllowedBet,
} from './odds';
import type {
  CashoutResult,
  PlaceBetResult,
  RoundListener,
  RoundSnapshot,
  RoundSource,
  AviatorPhase,
} from './RoundSource';

/**
 * Demo / offline round loop. Drop-in RoundSource for GameScene.
 * Replace with LiveRoundSource when wiring REST + WebSocket.
 */
export class LocalRoundSource implements RoundSource {
  private phase: AviatorPhase = 'waiting';
  private roundId = '';
  private bettingEndsAt = 0;
  private startedAt = 0;
  private crashMult = 1;
  private crashAtWall = 0;
  private crashedAt = 0;
  private nextRoundAt = 0;
  private history: number[] = [];

  private balance: number;
  private selectedBet: number;
  private stake = 0;
  private hasBet = false;
  private cashedOut = false;
  private cashedOutMult: number | null = null;
  private payout = 0;

  private listeners = new Set<RoundListener>();

  constructor(balance: number, initialBet: number) {
    this.balance = Math.max(0, balance);
    this.selectedBet = this.clampBet(initialBet);
  }

  subscribe(fn: RoundListener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot(Date.now()));
    return () => this.listeners.delete(fn);
  }

  start(now = Date.now()): void {
    this.beginWaiting(now);
    this.emit(now);
  }

  tick(now = Date.now()): RoundSnapshot {
    if (this.phase === 'waiting' && now >= this.bettingEndsAt) {
      this.beginFlying(now);
    } else if (this.phase === 'flying' && now >= this.crashAtWall) {
      this.beginCrashed(now);
    } else if (this.phase === 'crashed' && now >= this.nextRoundAt) {
      this.beginWaiting(now);
    }
    const snap = this.snapshot(now);
    this.emit(now, snap);
    return snap;
  }

  setSelectedBet(bet: number): void {
    if (this.phase !== 'waiting' || this.hasBet) return;
    this.selectedBet = this.clampBet(bet);
    this.emit(Date.now());
  }

  placeBet(): PlaceBetResult {
    const now = Date.now();
    if (this.phase !== 'waiting') return { ok: false, reason: 'Wait for next round' };
    if (this.hasBet) return { ok: false, reason: 'Already bet' };
    if (this.balance < this.selectedBet) return { ok: false, reason: 'Insufficient balance' };

    this.balance -= this.selectedBet;
    this.stake = this.selectedBet;
    this.hasBet = true;
    this.cashedOut = false;
    this.cashedOutMult = null;
    this.payout = 0;
    this.emit(now);
    return { ok: true };
  }

  cashout(): CashoutResult {
    const now = Date.now();
    if (this.phase !== 'flying') return { ok: false, reason: 'Not flying' };
    if (!this.hasBet || this.cashedOut) return { ok: false, reason: 'No active bet' };

    const mult = Math.max(MIN_CASHOUT, this.liveMult(now));
    const payout = payoutForCashout(this.stake, mult);
    this.cashedOut = true;
    this.cashedOutMult = mult;
    this.payout = payout;
    this.balance += payout;
    this.emit(now);
    return { ok: true, payout, mult };
  }

  getBalance(): number {
    return this.balance;
  }

  snapshot(now = Date.now()): RoundSnapshot {
    const mult = this.liveMult(now);
    return {
      phase: this.phase,
      roundId: this.roundId,
      multiplier: mult,
      crashMult: this.crashMult,
      bettingEndsAt: this.bettingEndsAt,
      startedAt: this.startedAt,
      crashedAt: this.crashedAt,
      nextRoundAt: this.nextRoundAt,
      history: [...this.history],
      balance: this.balance,
      selectedBet: this.selectedBet,
      stake: this.stake,
      hasBet: this.hasBet,
      cashedOut: this.cashedOut,
      cashedOutMult: this.cashedOutMult,
      payout: this.payout,
      canBet: this.phase === 'waiting' && !this.hasBet && this.balance >= this.selectedBet,
      canCashout: this.phase === 'flying' && this.hasBet && !this.cashedOut,
    };
  }

  destroy(): void {
    this.listeners.clear();
  }

  private beginWaiting(now: number): void {
    this.phase = 'waiting';
    this.roundId = `av-${now}-${Math.floor(Math.random() * 1e6)}`;
    this.bettingEndsAt = now + BETTING_MS;
    this.startedAt = 0;
    this.crashMult = 0;
    this.crashAtWall = 0;
    this.crashedAt = 0;
    this.nextRoundAt = 0;
    this.stake = 0;
    this.hasBet = false;
    this.cashedOut = false;
    this.cashedOutMult = null;
    this.payout = 0;
  }

  private beginFlying(now: number): void {
    this.phase = 'flying';
    this.startedAt = now;
    this.crashMult = generateCrashPoint();
    this.crashAtWall = now + timeToReachMs(this.crashMult);
    if (this.crashAtWall <= now) this.crashAtWall = now + 220;
  }

  private beginCrashed(now: number): void {
    this.phase = 'crashed';
    this.crashedAt = now;
    this.nextRoundAt = now + CRASHED_MS;
    this.crashMult = this.crashMult || 1;
    this.history = [this.crashMult, ...this.history].slice(0, HISTORY_LEN);
    if (this.hasBet && !this.cashedOut) {
      this.payout = 0;
    }
  }

  private liveMult(now: number): number {
    if (this.phase === 'crashed') return this.crashMult;
    if (this.phase !== 'flying') return 1;
    return Math.min(multiplierAt(now - this.startedAt), this.crashMult || 1e9);
  }

  private clampBet(bet: number): AllowedBet {
    const allowed = ALLOWED_BETS as readonly number[];
    if (allowed.includes(bet)) return bet as AllowedBet;
    return 10;
  }

  private emit(now: number, snap?: RoundSnapshot): void {
    const s = snap ?? this.snapshot(now);
    for (const fn of this.listeners) fn(s);
  }
}

/** @deprecated Use LocalRoundSource — kept as alias for older imports. */
export { LocalRoundSource as RoundEngine };
