/**
 * Crypto Withdrawal Service — quote, confirm, create, list.
 * Money mutations go through Transaction Service only.
 */

import {
  captureCryptoWithdraw,
  lockCryptoWithdraw,
  unlockCryptoWithdraw,
  writePaymentAudit,
} from '../transactions/index.js';
import { ensureUserWallets, getWalletBalance } from '../wallet/index.js';
import { addressesEqual, parseTonAddress } from './address.js';
import { getAddressByUser } from './store.js';
import {
  isCryptoWithdrawEnabled,
  resolveWithdrawDailyLimit,
  resolveWithdrawFee,
  resolveWithdrawMax,
  resolveWithdrawMin,
  type CryptoCurrency,
} from './config.js';
import { isCryptoCurrency } from './transactionService.js';
import {
  insertWithdraw,
  listUserWithdrawals,
  markWithdrawFailed,
  sumUserWithdrawalsToday,
  type WithdrawRow,
} from './withdrawStore.js';

export type WithdrawPublicStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'needs_reconcile';

export interface WithdrawQuote {
  currency: CryptoCurrency;
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

export interface WithdrawView {
  id: string;
  currency: CryptoCurrency;
  network: 'ton';
  toAddress: string;
  amount: number;
  networkFee: number;
  netAmount: number;
  status: WithdrawPublicStatus;
  txHash: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

function httpErr(statusCode: number, message: string): Error {
  return Object.assign(new Error(message), { statusCode });
}

function decimalsOf(currency: CryptoCurrency): number {
  return currency === 'TON' ? 9 : 6;
}

function symbolOf(currency: CryptoCurrency): string {
  return currency === 'TON' ? 'TON' : 'USDT';
}

export function toWithdrawView(row: WithdrawRow): WithdrawView {
  return {
    id: row.publicId,
    currency: row.currency,
    network: 'ton',
    toAddress: row.toAddress,
    amount: row.amount,
    networkFee: row.networkFee,
    netAmount: row.netAmount,
    status: row.status,
    txHash: row.txHash,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
  };
}

function assertCurrency(raw: unknown): CryptoCurrency {
  if (!isCryptoCurrency(raw)) {
    throw httpErr(400, 'Unsupported currency. Use TON or USDT_TON.');
  }
  return raw;
}

function assertAmount(amount: unknown): number {
  const n = typeof amount === 'string' ? Number(amount) : Number(amount);
  if (!Number.isFinite(n) || n <= 0) throw httpErr(400, 'Invalid amount');
  return Math.trunc(n);
}

function assertAddress(raw: string): { friendly: string; raw: string } {
  try {
    return parseTonAddress(raw);
  } catch {
    throw httpErr(400, 'Invalid TON wallet address');
  }
}

export async function quoteCryptoWithdraw(
  userId: number,
  currencyRaw: string,
  toAddressRaw: string,
  amountRaw: number | string,
): Promise<WithdrawQuote> {
  if (!isCryptoWithdrawEnabled()) {
    throw httpErr(503, 'Crypto withdrawals are not configured');
  }
  if (!(userId > 0)) throw httpErr(401, 'Unauthorized');

  const currency = assertCurrency(currencyRaw);
  const amount = assertAmount(amountRaw);
  const parsed = assertAddress(toAddressRaw);
  const fee = await resolveWithdrawFee(currency);
  const min = await resolveWithdrawMin(currency);
  const max = await resolveWithdrawMax(currency);
  const daily = await resolveWithdrawDailyLimit(currency);

  if (amount < min) throw httpErr(400, `Amount below minimum (${min})`);
  if (amount > max) throw httpErr(400, `Amount above maximum (${max})`);
  if (fee >= amount) throw httpErr(400, 'Amount too small to cover network fee');

  const netAmount = amount - fee;
  if (!(netAmount > 0)) throw httpErr(400, 'Net amount must be positive');

  const own = await getAddressByUser(userId);
  if (own && addressesEqual(parsed.friendly, own.address)) {
    await writePaymentAudit({
      userId,
      operation: 'crypto_withdraw_quote',
      outcome: 'rejected',
      currency,
      amount,
      network: 'ton',
      reason: 'withdraw_to_own_deposit_address',
      meta: { toAddress: parsed.friendly },
    });
    throw httpErr(400, 'Cannot withdraw to your deposit address');
  }

  await ensureUserWallets(userId);
  const bal = await getWalletBalance(userId, currency);
  const dailyUsed = await sumUserWithdrawalsToday(userId, currency);
  const dailyRemaining = Math.max(0, daily - dailyUsed);

  if (amount > dailyRemaining) {
    throw httpErr(400, `Daily withdraw limit exceeded (remaining ${dailyRemaining})`);
  }

  return {
    currency,
    network: 'ton',
    toAddress: parsed.friendly,
    amount,
    networkFee: fee,
    netAmount,
    minAmount: min,
    maxAmount: max,
    dailyLimit: daily,
    dailyUsed,
    dailyRemaining,
    available: bal.available,
    decimals: decimalsOf(currency),
    symbol: symbolOf(currency),
    canAfford: bal.available >= amount,
  };
}

export async function createCryptoWithdraw(args: {
  userId: number;
  currency: string;
  toAddress: string;
  amount: number | string;
  confirm: boolean;
}): Promise<WithdrawView> {
  if (!isCryptoWithdrawEnabled()) {
    throw httpErr(503, 'Crypto withdrawals are not configured');
  }
  if (!(args.userId > 0)) throw httpErr(401, 'Unauthorized');
  if (args.confirm !== true) {
    throw httpErr(400, 'User confirmation required (confirm: true)');
  }

  const quote = await quoteCryptoWithdraw(
    args.userId,
    args.currency,
    args.toAddress,
    args.amount,
  );

  if (!quote.canAfford) {
    await writePaymentAudit({
      userId: args.userId,
      operation: 'crypto_withdraw_create',
      outcome: 'rejected',
      currency: quote.currency,
      amount: quote.amount,
      network: 'ton',
      reason: 'insufficient_balance',
    });
    throw httpErr(400, 'Insufficient balance');
  }

  const row = await insertWithdraw({
    userId: args.userId,
    currency: quote.currency,
    toAddress: quote.toAddress,
    toAddressRaw: parseTonAddress(quote.toAddress).raw,
    amount: quote.amount,
    networkFee: quote.networkFee,
    netAmount: quote.netAmount,
  });

  const locked = await lockCryptoWithdraw({
    userId: args.userId,
    currency: quote.currency,
    amount: quote.amount,
    publicId: row.publicId,
    withdrawId: row.id,
    toAddress: row.toAddress,
    networkFee: row.networkFee,
    netAmount: row.netAmount,
  });

  if (!locked) {
    await markWithdrawFailed(row.publicId, 'insufficient_balance_on_lock');
    throw httpErr(400, 'Insufficient balance');
  }

  await writePaymentAudit({
    userId: args.userId,
    operation: 'crypto_withdraw_create',
    outcome: 'ok',
    currency: quote.currency,
    amount: quote.amount,
    network: 'ton',
    refTable: 'crypto_withdrawals',
    refId: String(row.id),
    meta: { publicId: row.publicId, toAddress: row.toAddress, netAmount: row.netAmount },
  });

  return toWithdrawView(row);
}

export async function listCryptoWithdrawals(userId: number, limit = 30) {
  const rows = await listUserWithdrawals(userId, limit);
  return rows.map(toWithdrawView);
}

export function cryptoWithdrawStatus() {
  return {
    enabled: isCryptoWithdrawEnabled(),
    network: 'ton' as const,
    currencies: ['TON', 'USDT_TON'] as const,
    statuses: ['pending', 'processing', 'completed', 'failed', 'needs_reconcile'] as const,
  };
}

/** Async status with live hub limits (for admin / detailed status). */
export async function cryptoWithdrawStatusDetailed() {
  return {
    ...cryptoWithdrawStatus(),
    fees: {
      TON: await resolveWithdrawFee('TON'),
      USDT_TON: await resolveWithdrawFee('USDT_TON'),
    },
    mins: {
      TON: await resolveWithdrawMin('TON'),
      USDT_TON: await resolveWithdrawMin('USDT_TON'),
    },
    maxes: {
      TON: await resolveWithdrawMax('TON'),
      USDT_TON: await resolveWithdrawMax('USDT_TON'),
    },
    dailyLimits: {
      TON: await resolveWithdrawDailyLimit('TON'),
      USDT_TON: await resolveWithdrawDailyLimit('USDT_TON'),
    },
  };
}

export async function captureWithdrawFunds(row: WithdrawRow): Promise<void> {
  await captureCryptoWithdraw({
    userId: row.userId,
    currency: row.currency,
    amount: row.amount,
    publicId: row.publicId,
    withdrawId: row.id,
    txHash: row.txHash,
  });
}

export async function unlockWithdrawFunds(row: WithdrawRow, reason: string): Promise<void> {
  await unlockCryptoWithdraw({
    userId: row.userId,
    currency: row.currency,
    amount: row.amount,
    publicId: row.publicId,
    withdrawId: row.id,
    reason,
  });
}
