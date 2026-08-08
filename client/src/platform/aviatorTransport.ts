import { api, resolveWsUrl } from '../api';
import { isDemoMode } from '../demo';
import { multiplierAt } from '../lib/aviatorOdds';
import type { AviatorRoundView, WalletCurrency } from '../types';
import type { GameTransport } from '../games/aviator';
import {
  RoundPhase,
  type ActiveBet,
  type BalanceSnapshot,
  type BetRequest,
  type CashoutRequest,
  type HistoryEntry,
  type RoundSnapshot,
  type TransportConfig,
  type TransportEvent,
  type TransportListener,
} from '../games/aviator';

/**
 * Live Aviator transport: REST for mutations + a read-only WebSocket feed,
 * exactly the channels the legacy React screen used.
 *
 * The server broadcasts phase changes only — the multiplier is recomputed here
 * from `startedAt` on the shared curve (lib/aviatorOdds), which is the same
 * function the server settles with. Demo mode is handled inside `api`, so this
 * one class covers both real and demo play.
 */

/** REST poll interval — primary channel in demo, fallback without a socket. */
const POLL_MS = 1000;
/** Local repaint rate for the interpolated multiplier. */
const TICK_MS = 60;
const RESULT_HOLD_MS = 1600;

export interface AviatorTransportOptions {
  /** Wallet currency the stake is paid from (shared wager preference). */
  getCurrency: () => WalletCurrency;
  onCurrencyChange?: (currency: WalletCurrency) => void;
  /** Localized error text when the round snapshot cannot be loaded. */
  loadErrorText?: string;
}

export class AviatorAppTransport implements GameTransport {
  private listeners = new Set<TransportListener>();
  private round: AviatorRoundView | null = null;
  private balance = 0;
  private balanceCurrency: WalletCurrency = 'STARS';
  private history: HistoryEntry[] = [];
  private activeBet: ActiveBet | null = null;
  private config: TransportConfig = {
    allowedBets: [1, 5, 10, 25, 50, 100],
    minBet: 1,
    maxBet: 100,
    countdownSeconds: 6,
    currencies: ['STARS', 'TON', 'USDT_TON'],
    balanceCurrency: 'STARS',
  };

  /** serverNow − Date.now(): compensates clock drift, like ArenaGame. */
  private clockOffset = 0;
  private alive = false;
  private ws: WebSocket | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private retryMs = 2000;

  /** Local crash timestamp — drives the synthetic RESULT / NEXT_ROUND beats. */
  private crashedAtLocal = 0;

  constructor(private options: AviatorTransportOptions) {}

  async connect(): Promise<void> {
    if (this.alive) return;
    this.alive = true;

    try {
      await this.loadState();
    } catch (err) {
      this.emit({
        type: 'bet_rejected',
        reason: this.options.loadErrorText ?? errorText(err),
      });
    }

    // Demo rounds live entirely in the browser — no socket to open.
    if (isDemoMode()) this.startPolling();
    else this.openSocket();

    this.tickTimer = setInterval(() => this.pushRound(), TICK_MS);
  }

  disconnect(): void {
    this.alive = false;
    this.stopPolling();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.closeSocket();
    this.listeners.clear();
  }

  subscribe(listener: TransportListener): () => void {
    this.listeners.add(listener);
    listener({ type: 'round_update', round: this.snapshotRound() });
    listener({ type: 'balance_update', balance: this.getBalance() });
    listener({ type: 'history_update', history: this.getHistory() });
    return () => this.listeners.delete(listener);
  }

  getRound(): RoundSnapshot {
    return this.snapshotRound();
  }

  getBalance(): BalanceSnapshot {
    return { balance: this.balance, currency: this.balanceCurrency };
  }

  getActiveBet(): ActiveBet | null {
    return this.activeBet ? { ...this.activeBet } : null;
  }

  getHistory(): HistoryEntry[] {
    return [...this.history];
  }

  getConfig(): TransportConfig {
    return { ...this.config, allowedBets: [...this.config.allowedBets] };
  }

  setCurrency(currency: string): void {
    if (currency !== 'STARS' && currency !== 'TON' && currency !== 'USDT_TON') return;
    this.options.onCurrencyChange?.(currency);
  }

  async placeBet(request: BetRequest): Promise<void> {
    const roundId = this.round?.roundId;
    try {
      const currency = (request.currency ?? this.options.getCurrency()) as WalletCurrency;
      const res = await api.aviatorBet(
        Number(request.amount),
        request.autoCashout ?? null,
        currency,
      );
      this.applyRound(res.round, res.now);
      this.setBalance(res.balance);

      this.activeBet = {
        betId: res.round.roundId || roundId || 'bet',
        roundId: res.round.roundId,
        amount: res.round.myBet,
        autoCashout: res.round.myAutoCashout,
        cashedOut: res.round.myCashedOutMult !== null,
        cashoutMultiplier: res.round.myCashedOutMult,
        payout: res.round.myPayout || null,
        status: res.round.phase === 'flying' ? 'active' : 'pending',
      };
      this.emit({ type: 'bet_accepted', bet: this.getActiveBet()!, balance: this.getBalance() });
      this.emit({ type: 'balance_update', balance: this.getBalance() });
    } catch (err) {
      this.emit({ type: 'bet_rejected', reason: errorText(err) });
    }
  }

  async cashout(_request: CashoutRequest): Promise<void> {
    const roundId = this.round?.roundId;
    if (!roundId) return;
    try {
      const res = await api.aviatorCashout(roundId);
      this.applyRound(res.round, res.now);
      this.setBalance(res.balance);

      this.activeBet = {
        betId: roundId,
        roundId,
        amount: res.round.myBet,
        autoCashout: res.round.myAutoCashout,
        cashedOut: true,
        cashoutMultiplier: res.multiplier,
        payout: res.payout,
        status: 'cashed_out',
      };
      this.emit({ type: 'cashout_result', bet: this.getActiveBet()!, balance: this.getBalance() });
      this.emit({ type: 'balance_update', balance: this.getBalance() });
    } catch (err) {
      this.emit({ type: 'bet_rejected', reason: errorText(err) });
    }
  }

  // ── Server state ───────────────────────────────────────────────────────

  private async loadState(): Promise<void> {
    const data = await api.aviatorState();
    if (!this.alive && this.round) return;
    this.applyRound(data.round, data.now);
    this.setBalance(data.balance);
    if (data.config) {
      this.config = {
        ...this.config,
        allowedBets: [...data.config.allowedBets],
        minBet: data.config.allowedBets[0] ?? this.config.minBet,
        maxBet: data.config.maxTotalBetPerPlayer,
        countdownSeconds: Math.round(data.config.bettingWindowMs / 1000),
      };
    }
    this.applyHistory(data.round?.history ?? data.history ?? []);
  }

  private applyRound(next: AviatorRoundView | null, serverTs?: number): void {
    if (typeof serverTs === 'number') this.clockOffset = serverTs - Date.now();

    const prevPhase = this.round?.phase;
    const prevCashed = this.round?.myCashedOutMult ?? null;
    this.round = next;

    if (next) {
      this.applyHistory(next.history);
      this.syncActiveBet(next);
    }

    // Server settled an auto-cashout for us: surface it as a cashout result.
    if (next && prevCashed === null && next.myCashedOutMult !== null && this.activeBet) {
      this.emit({ type: 'cashout_result', bet: this.getActiveBet()!, balance: this.getBalance() });
      void this.refreshBalance();
    }

    if (prevPhase === 'flying' && next?.phase === 'crashed') {
      this.crashedAtLocal = Date.now();
      // Lost stakes are debited server-side at crash time.
      if (this.activeBet && !this.activeBet.cashedOut) {
        this.activeBet = { ...this.activeBet, status: 'lost', payout: 0 };
        this.emit({
          type: 'cashout_result',
          bet: this.getActiveBet()!,
          balance: this.getBalance(),
        });
      }
      void this.refreshBalance();
    }

    // A fresh betting window clears the crash hold.
    if (next?.phase === 'betting' && prevPhase !== 'betting') this.crashedAtLocal = 0;

    this.pushRound();
  }

  private syncActiveBet(round: AviatorRoundView): void {
    if (round.myBet <= 0) {
      // A new round wipes the previous stake.
      if (this.activeBet && this.activeBet.roundId !== round.roundId) this.activeBet = null;
      return;
    }
    this.activeBet = {
      betId: round.roundId,
      roundId: round.roundId,
      amount: round.myBet,
      autoCashout: round.myAutoCashout,
      cashedOut: round.myCashedOutMult !== null,
      cashoutMultiplier: round.myCashedOutMult,
      payout: round.myPayout || null,
      status:
        round.myCashedOutMult !== null
          ? 'cashed_out'
          : round.phase === 'flying'
            ? 'active'
            : round.phase === 'crashed'
              ? 'lost'
              : 'pending',
    };
  }

  private applyHistory(history: number[]): void {
    const now = Date.now();
    // Server keeps the freshest crash last; the strip reads newest-first.
    this.history = [...history]
      .reverse()
      .map((crashAt, i) => ({ roundId: `h${i}`, crashAt, timestamp: now - i }));
    this.emit({ type: 'history_update', history: this.getHistory() });
  }

  private setBalance(balance: number): void {
    if (balance === this.balance) return;
    this.balance = balance;
    this.emit({ type: 'balance_update', balance: this.getBalance() });
  }

  private async refreshBalance(): Promise<void> {
    try {
      this.setBalance(await api.getBalance());
    } catch {
      /* balance will catch up on the next snapshot */
    }
  }

  // ── Snapshot projection ────────────────────────────────────────────────

  private serverNow(): number {
    return Date.now() + this.clockOffset;
  }

  /** Server phases + local clock → the module's RoundSnapshot. */
  private snapshotRound(): RoundSnapshot {
    const r = this.round;
    if (!r) {
      return {
        roundId: 'idle',
        phase: RoundPhase.IDLE,
        multiplier: 1,
        countdown: 0,
        crashAt: null,
        startedAt: null,
        crashedAt: null,
      };
    }

    const now = this.serverNow();

    if (r.phase === 'betting') {
      const countdown = Math.max(0, ((r.bettingEndsAt ?? now) - now) / 1000);
      return {
        roundId: r.roundId,
        phase: RoundPhase.COUNTDOWN,
        multiplier: 1,
        countdown,
        crashAt: null,
        startedAt: null,
        crashedAt: null,
      };
    }

    if (r.phase === 'flying') {
      const elapsed = Math.max(0, now - (r.startedAt ?? now));
      return {
        roundId: r.roundId,
        phase: RoundPhase.FLIGHT,
        multiplier: Math.max(1, multiplierAt(elapsed)),
        countdown: 0,
        crashAt: null,
        startedAt: r.startedAt,
        crashedAt: null,
      };
    }

    // crashed → CRASH, then a short RESULT beat, then NEXT_ROUND while waiting.
    const crashMult = r.crashMultiplier ?? r.multiplier;
    const sinceCrash = this.crashedAtLocal ? Date.now() - this.crashedAtLocal : 0;
    const phase =
      sinceCrash > RESULT_HOLD_MS * 2
        ? RoundPhase.NEXT_ROUND
        : sinceCrash > RESULT_HOLD_MS
          ? RoundPhase.RESULT
          : RoundPhase.CRASH;

    return {
      roundId: r.roundId,
      phase,
      multiplier: crashMult,
      countdown: 0,
      crashAt: crashMult,
      startedAt: r.startedAt,
      crashedAt: this.crashedAtLocal || null,
    };
  }

  private pushRound(): void {
    this.emit({ type: 'round_update', round: this.snapshotRound() });
  }

  private emit(event: TransportEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  // ── Channels ───────────────────────────────────────────────────────────

  private startPolling(): void {
    if (this.pollTimer) return;
    const loop = async () => {
      this.pollTimer = null;
      try {
        await this.loadState();
      } catch {
        /* keep polling; the snapshot will recover */
      }
      if (this.alive) this.pollTimer = setTimeout(loop, POLL_MS);
    };
    void loop();
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private openSocket(): void {
    if (!this.alive) return;

    let ws: WebSocket;
    try {
      ws = new WebSocket(resolveWsUrl('/api/aviator/ws'));
    } catch {
      this.startPolling();
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      if (!this.alive) return;
      this.retryMs = 2000;
      this.stopPolling(); // socket is live — polling would just re-read balances
    };

    ws.onmessage = (ev) => {
      if (!this.alive) return;
      let msg: { type?: string; data?: unknown; now?: number };
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (typeof msg.now === 'number') this.clockOffset = msg.now - Date.now();
      this.handleSocketMessage(msg);
    };

    const fallback = () => {
      if (this.ws === ws) this.ws = null;
      if (!this.alive) return;
      this.startPolling(); // cover the gap while we reconnect
      this.scheduleReconnect();
    };
    ws.onerror = fallback;
    ws.onclose = fallback;
  }

  private handleSocketMessage(msg: { type?: string; data?: unknown; now?: number }): void {
    const cur = this.round;

    switch (msg.type) {
      case 'aviator:round': {
        const data = msg.data as (AviatorRoundView & { round?: null }) | null;
        if (!data || data.round === null || !data.roundId) {
          this.applyRound(null, msg.now);
        } else {
          // The broadcast is not personalized — keep our own bet fields.
          this.applyRound(
            cur && cur.roundId === data.roundId
              ? {
                  ...data,
                  myBet: cur.myBet,
                  myAutoCashout: cur.myAutoCashout,
                  myCashedOutMult: cur.myCashedOutMult,
                  myPayout: cur.myPayout,
                }
              : data,
            msg.now,
          );
        }
        break;
      }

      case 'aviator:cashout': {
        const d = msg.data as { roundId: string; userId: number; mult: number; payout: number };
        if (!cur || cur.roundId !== d.roundId) break;
        const players = cur.players.map((p) =>
          p.userId === d.userId ? { ...p, cashedOutMult: d.mult, payout: d.payout } : p,
        );
        const mine = players.find((p) => p.isMe && !p.isBot);
        this.applyRound(
          {
            ...cur,
            players,
            myCashedOutMult: mine?.cashedOutMult ?? cur.myCashedOutMult,
            myPayout: mine?.payout ?? cur.myPayout,
          },
          msg.now,
        );
        break;
      }

      case 'aviator:crash': {
        const d = msg.data as { roundId: string; crashMult: number };
        if (!cur || cur.roundId !== d.roundId) break;
        this.applyRound(
          {
            ...cur,
            phase: 'crashed',
            crashMultiplier: d.crashMult,
            multiplier: d.crashMult,
            history: [...cur.history.slice(-19), d.crashMult],
          },
          msg.now,
        );
        break;
      }

      default:
        break;
    }
  }

  private scheduleReconnect(): void {
    if (!this.alive || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, this.retryMs);
    this.retryMs = Math.min(15000, this.retryMs * 2);
  }

  private closeSocket(): void {
    const sock = this.ws;
    this.ws = null;
    if (!sock) return;
    sock.onopen = null;
    sock.onmessage = null;
    sock.onerror = null;
    sock.onclose = null;
    try {
      sock.close();
    } catch {
      /* ignore */
    }
  }
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
