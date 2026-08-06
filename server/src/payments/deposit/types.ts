/** Deposit Service domain types (Payment Hub). */

export const DEPOSIT_RAILS = ['telegram_stars', 'ton', 'usdt_ton'] as const;
export type DepositRail = (typeof DEPOSIT_RAILS)[number];

export const DEPOSIT_STATUSES = ['pending', 'confirming', 'paid', 'failed', 'expired'] as const;
export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];

export type DepositProductKind = 'wallet_credit' | 'premium_wheel';

export type DepositCurrency = 'STARS' | 'TON' | 'USDT_TON';

export interface DepositMethod {
  rail: DepositRail;
  currency: DepositCurrency;
  label: string;
  network: string | null;
  decimals: number;
  minAmount: number;
  enabled: boolean;
  /** Human hint for UI (memo / invoice). */
  hint: string;
}

export interface DepositOrder {
  id: number;
  publicId: string;
  userId: number;
  rail: DepositRail;
  currency: DepositCurrency;
  productKind: DepositProductKind;
  expectedAmount: number;
  receivedAmount: number | null;
  status: DepositStatus;
  externalId: string | null;
  packageId: string | null;
  depositAddress: string | null;
  memo: string | null;
  confirmations: number;
  requiredConfirmations: number;
  meta: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

export interface DepositOrderView {
  id: string;
  rail: DepositRail;
  currency: DepositCurrency;
  productKind: DepositProductKind;
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
  /** STARS available after paid wallet credit (compat). */
  newBalance?: number | null;
}

export function isDepositRail(v: unknown): v is DepositRail {
  return typeof v === 'string' && (DEPOSIT_RAILS as readonly string[]).includes(v);
}

export function isDepositCurrency(v: unknown): v is DepositCurrency {
  return v === 'STARS' || v === 'TON' || v === 'USDT_TON';
}
