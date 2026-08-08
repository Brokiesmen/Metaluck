import { AviatorConfig } from '../config/aviatorConfig';
import { generateCrashPoint } from './houseEdge';
import type { GameTransport } from './GameTransport';
import type {
  ActiveBet,
  BalanceSnapshot,
  BetRequest,
  CashoutRequest,
  HistoryEntry,
  RoundSnapshot,
  TransportConfig,
  TransportEvent,
  TransportListener,
} from './types';
import { RoundPhase as Phase } from './types';

/**
 * Offline round loop that mimics the server engine.
 * Used by the standalone dev page and as a fallback when the host does not
 * inject a live transport — never for real money.
 */
export class DemoTransport implements GameTransport {
  private listeners = new Set<TransportListener>();
  private balance: number;
  private currency = 'STARS';
  private round: RoundSnapshot = emptyRound();
  private activeBet: ActiveBet | null = null;
  private history: HistoryEntry[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private pending = new Set<ReturnType<typeof setTimeout>>();
  private crashPoint = 1;
  private flightStartedAt = 0;
  private running = false;

  constructor(startingBalance: number = AviatorConfig.startingBalance) {
    this.balance = startingBalance;
  }

  async connect(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.emit({ type: 'balance_update', balance: this.snapshotBalance() });
    this.scheduleNextRound(400);
  }

  disconnect(): void {
    this.running = false;
    this.clearTimer();
    for (const id of this.pending) clearTimeout(id);
    this.pending.clear();
    this.listeners.clear();
  }

  subscribe(listener: TransportListener): () => void {
    this.listeners.add(listener);
    listener({ type: 'round_update', round: { ...this.round } });
    listener({ type: 'balance_update', balance: this.snapshotBalance() });
    listener({ type: 'history_update', history: [...this.history] });
    return () => this.listeners.delete(listener);
  }

  getRound(): RoundSnapshot {
    return { ...this.round };
  }

  getBalance(): BalanceSnapshot {
    return this.snapshotBalance();
  }

  getActiveBet(): ActiveBet | null {
    return this.activeBet ? { ...this.activeBet } : null;
  }

  getHistory(): HistoryEntry[] {
    return [...this.history];
  }

  getConfig(): TransportConfig {
    return {
      allowedBets: [...AviatorConfig.betPresets],
      minBet: AviatorConfig.minBet,
      maxBet: AviatorConfig.maxBet,
      countdownSeconds: AviatorConfig.countdownSeconds,
      currencies: [],
      balanceCurrency: this.currency,
    };
  }

  async placeBet(request: BetRequest): Promise<void> {
    const amount = Number(request.amount);
    if (!Number.isFinite(amount) || amount < AviatorConfig.minBet) {
      this.emit({ type: 'bet_rejected', reason: 'Invalid bet amount' });
      return;
    }
    if (amount > AviatorConfig.maxBet) {
      this.emit({ type: 'bet_rejected', reason: 'Bet exceeds maximum' });
      return;
    }
    if (amount > this.balance) {
      this.emit({ type: 'bet_rejected', reason: 'Insufficient balance' });
      return;
    }
    const bettingOpen =
      this.round.phase === Phase.IDLE ||
      this.round.phase === Phase.COUNTDOWN ||
      this.round.phase === Phase.NEXT_ROUND;
    if (!bettingOpen) {
      this.emit({ type: 'bet_rejected', reason: 'Betting closed for this round' });
      return;
    }
    if (this.activeBet && (this.activeBet.status === 'pending' || this.activeBet.status === 'active')) {
      this.emit({ type: 'bet_rejected', reason: 'Already have an active bet' });
      return;
    }

    this.balance = roundMoney(this.balance - amount);

    const bet: ActiveBet = {
      betId: `bet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      roundId: this.round.roundId,
      amount,
      autoCashout: request.autoCashout && request.autoCashout > 1 ? request.autoCashout : null,
      cashedOut: false,
      cashoutMultiplier: null,
      payout: null,
      status: 'pending',
    };

    this.activeBet = bet;
    this.emit({ type: 'bet_accepted', bet: { ...bet }, balance: this.snapshotBalance() });
    this.emit({ type: 'balance_update', balance: this.snapshotBalance() });
  }

  async cashout(_request: CashoutRequest): Promise<void> {
    this.settleCashout();
  }

  private snapshotBalance(): BalanceSnapshot {
    return { balance: this.balance, currency: this.currency };
  }

  private settleCashout(): void {
    const bet = this.activeBet;
    if (!bet || bet.cashedOut) return;
    if (this.round.phase !== Phase.FLIGHT) return;
    if (bet.status !== 'active' && bet.status !== 'pending') return;

    const mult = this.round.multiplier;
    const payout = roundMoney(bet.amount * mult);

    const settled: ActiveBet = {
      ...bet,
      cashedOut: true,
      cashoutMultiplier: mult,
      payout,
      status: 'cashed_out',
    };

    this.activeBet = settled;
    this.balance = roundMoney(this.balance + payout);

    this.emit({ type: 'cashout_result', bet: { ...settled }, balance: this.snapshotBalance() });
    this.emit({ type: 'balance_update', balance: this.snapshotBalance() });
  }

  private later(fn: () => void, delayMs: number): void {
    const id = setTimeout(() => {
      this.pending.delete(id);
      if (!this.running) return;
      fn();
    }, delayMs);
    this.pending.add(id);
  }

  private scheduleNextRound(delayMs: number): void {
    if (!this.running) return;
    this.clearTimer();
    this.later(() => this.startCountdown(), delayMs);
  }

  private startCountdown(): void {
    const roundId = `r_${Date.now().toString(36)}`;
    this.crashPoint = generateCrashPoint();
    this.round = {
      roundId,
      phase: Phase.COUNTDOWN,
      multiplier: 1,
      countdown: AviatorConfig.countdownSeconds,
      crashAt: null,
      startedAt: null,
      crashedAt: null,
    };

    if (this.activeBet && this.activeBet.status === 'pending') {
      this.activeBet = { ...this.activeBet, roundId };
    } else {
      this.activeBet = null;
    }

    this.pushRound();

    const started = now();
    this.clearTimer();
    this.timer = setInterval(() => {
      if (!this.running) return;
      const elapsed = (now() - started) / 1000;
      const remaining = Math.max(0, AviatorConfig.countdownSeconds - elapsed);
      this.round = { ...this.round, countdown: remaining, phase: Phase.COUNTDOWN };
      this.pushRound();
      if (remaining <= 0) this.startFlight();
    }, 50);
  }

  private startFlight(): void {
    this.clearTimer();
    this.flightStartedAt = now();
    this.round = {
      ...this.round,
      phase: Phase.FLIGHT,
      multiplier: 1,
      countdown: 0,
      startedAt: Date.now(),
      crashAt: null,
      crashedAt: null,
    };

    if (this.activeBet && this.activeBet.status === 'pending') {
      this.activeBet = { ...this.activeBet, status: 'active', roundId: this.round.roundId };
    }

    this.pushRound();

    this.timer = setInterval(() => {
      if (!this.running) return;
      const t = (now() - this.flightStartedAt) / 1000;
      const display = Math.floor(Math.exp(AviatorConfig.growthRate * t) * 100) / 100;

      if (display >= this.crashPoint) {
        this.doCrash();
        return;
      }

      this.round = { ...this.round, multiplier: display, phase: Phase.FLIGHT };
      this.pushRound();

      if (
        this.activeBet &&
        !this.activeBet.cashedOut &&
        this.activeBet.autoCashout &&
        display >= this.activeBet.autoCashout
      ) {
        this.settleCashout();
      }
    }, AviatorConfig.tickMs);
  }

  private doCrash(): void {
    this.clearTimer();
    const crashAt = this.crashPoint;
    this.round = {
      ...this.round,
      phase: Phase.CRASH,
      multiplier: crashAt,
      crashAt,
      crashedAt: Date.now(),
    };
    this.pushRound();

    if (this.activeBet && !this.activeBet.cashedOut && this.activeBet.status === 'active') {
      this.activeBet = { ...this.activeBet, status: 'lost', payout: 0, cashoutMultiplier: null };
      this.emit({
        type: 'cashout_result',
        bet: { ...this.activeBet },
        balance: this.snapshotBalance(),
      });
    }

    this.history = [
      { roundId: this.round.roundId, crashAt, timestamp: Date.now() },
      ...this.history,
    ].slice(0, 24);
    this.emit({ type: 'history_update', history: [...this.history] });

    this.later(() => {
      this.round = { ...this.round, phase: Phase.RESULT };
      this.pushRound();

      this.later(() => {
        this.round = { ...this.round, phase: Phase.NEXT_ROUND };
        this.pushRound();
        this.activeBet = null;
        this.scheduleNextRound(AviatorConfig.nextRoundDelayMs);
      }, AviatorConfig.resultHoldMs);
    }, 650);
  }

  private pushRound(): void {
    this.emit({ type: 'round_update', round: { ...this.round } });
  }

  private emit(event: TransportEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

function emptyRound(): RoundSnapshot {
  return {
    roundId: 'boot',
    phase: Phase.IDLE,
    multiplier: 1,
    countdown: 0,
    crashAt: null,
    startedAt: null,
    crashedAt: null,
  };
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
