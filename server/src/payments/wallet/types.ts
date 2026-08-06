/** Wallet Service domain types (Payment Hub). */

export const WALLET_CURRENCIES = ['STARS', 'TON', 'USDT_TON'] as const;
export type WalletCurrency = (typeof WALLET_CURRENCIES)[number];

export type WalletEntryType =
  | 'credit'
  | 'debit'
  | 'deposit'
  | 'withdraw_lock'
  | 'withdraw_unlock'
  | 'withdraw_capture'
  | 'exchange'
  | 'game_bet'
  | 'game_win'
  | 'referral'
  | 'lock'
  | 'unlock'
  | 'adjustment'
  | 'legacy_add_balance'
  | 'legacy_try_deduct';

export interface CurrencyInfo {
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
  /** Amount in smallest units (★ = 1, TON = nanotons, USDT = micros). */
  available: number;
  locked: number;
  decimals: number;
  displaySymbol: string;
}

export interface WalletSnapshot {
  userId: number;
  balances: WalletBalance[];
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

export interface WalletMutationMeta {
  entryType?: WalletEntryType | string;
  idempotencyKey?: string | null;
  refTable?: string | null;
  refId?: string | null;
  meta?: Record<string, unknown>;
}

export function isWalletCurrency(value: unknown): value is WalletCurrency {
  return typeof value === 'string' && (WALLET_CURRENCIES as readonly string[]).includes(value);
}
