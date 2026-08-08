import type {
  ActiveBet,
  BalanceSnapshot,
  BetRequest,
  CashoutRequest,
  HistoryEntry,
  RoundSnapshot,
  TransportConfig,
  TransportListener,
} from './types';

/**
 * Abstract Aviator transport.
 * In production this is REST + WebSocket against the trusted server; offline it
 * is DemoTransport. Phaser and the DOM panel only render what arrives here —
 * they never mint payouts.
 */
export interface GameTransport {
  connect(): Promise<void>;
  disconnect(): void;

  subscribe(listener: TransportListener): () => void;

  getRound(): RoundSnapshot;
  getBalance(): BalanceSnapshot;
  getActiveBet(): ActiveBet | null;
  getHistory(): HistoryEntry[];
  getConfig(): TransportConfig;

  placeBet(request: BetRequest): Promise<void>;
  cashout(request: CashoutRequest): Promise<void>;

  setCurrency?(currency: string): void;
}
