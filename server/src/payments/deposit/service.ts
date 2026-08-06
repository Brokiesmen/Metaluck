import crypto from 'crypto';
import {
  PREMIUM_WHEEL_PACKAGE_ID,
  PREMIUM_WHEEL_XTR,
} from '../../wheel.js';
import {
  createTopupInvoiceLink,
  getInvoicePackageById,
  getTopupPackageById,
  TOPUP_PACKAGES,
} from './starsInvoice.js';
import {
  addReferralEarned,
  ensureReferral,
  failTopupOrder,
  getReferral,
  insertTopupOrder,
  claimTopupPaid,
  setTopupOrderMeta,
} from '../../supabaseStore.js';
import { REFERRAL_CASHBACK_PERCENT } from '../../routes/referrals.js';
import { creditWallet } from '../wallet/index.js';
import {
  cryptoDepositTtlMs,
  listDepositMethods,
  minTonNanotons,
  minUsdtMicros,
  tonConfirmationsRequired,
  tonDepositAddress,
} from './config.js';
import { findTonTransfer, findUsdtTonTransfer } from './tonApi.js';
import {
  claimDepositPaid,
  expireDepositOrder,
  failDepositOrder,
  getDepositByPublicId,
  getDepositForUser,
  insertDepositOrder,
  listUserDeposits,
  markDepositConfirming,
  patchDepositMeta,
} from './store.js';
import type {
  DepositCurrency,
  DepositOrder,
  DepositOrderView,
  DepositRail,
} from './types.js';

function buildStarsPayload(userId: number, packageId: string): string {
  const nonce = crypto.randomBytes(6).toString('hex');
  const payload = `mg:1:${userId}:${packageId}:${nonce}`;
  if (payload.length > 128) throw new Error('Invoice payload too long');
  return payload;
}

function buildCryptoMemo(userId: number): string {
  // Short unique memo for TON comment (keep ASCII)
  const rand = crypto.randomBytes(4).toString('hex');
  return `ml${userId.toString(16)}${rand}`;
}

function toView(order: DepositOrder, extra: Partial<DepositOrderView> = {}): DepositOrderView {
  return {
    id: order.publicId,
    rail: order.rail,
    currency: order.currency,
    productKind: order.productKind,
    status: order.status,
    expectedAmount: order.expectedAmount,
    receivedAmount: order.receivedAmount,
    confirmations: order.confirmations,
    requiredConfirmations: order.requiredConfirmations,
    depositAddress: order.depositAddress,
    memo: order.memo,
    packageId: order.packageId,
    expiresAt: order.expiresAt,
    createdAt: order.createdAt,
    ...extra,
  };
}

async function creditDepositToWallet(order: DepositOrder, amount: number): Promise<void> {
  if (order.productKind !== 'wallet_credit') return;
  if (amount <= 0) return;
  await creditWallet(order.userId, order.currency, amount, {
    entryType: 'deposit',
    idempotencyKey: `deposit:${order.publicId}`,
    refTable: 'deposit_orders',
    refId: String(order.id),
    meta: {
      rail: order.rail,
      externalId: order.externalId,
      packageId: order.packageId,
    },
  });
}

async function applyReferralCashbackStars(
  userId: number,
  starsCredited: number,
  depositPublicId: string,
): Promise<void> {
  if (starsCredited <= 0) return;
  const referral = await getReferral(userId);
  const inviterId = Number(referral?.referred_by ?? 0);
  const cashback =
    inviterId > 0 ? Math.floor((starsCredited * REFERRAL_CASHBACK_PERCENT) / 100) : 0;
  if (cashback <= 0) return;
  await ensureReferral(inviterId);
  await creditWallet(inviterId, 'STARS', cashback, {
    entryType: 'referral',
    idempotencyKey: `deposit_referral:${depositPublicId}`,
    refTable: 'deposit_orders',
    refId: depositPublicId,
    meta: { fromUserId: userId, percent: REFERRAL_CASHBACK_PERCENT },
  });
  await addReferralEarned(inviterId, cashback);
}

/** After claim: credit wallet / mark premium / referral. Safe to retry (wallet idempotent). */
async function finalizeClaimedDeposit(order: DepositOrder): Promise<DepositOrder> {
  if (order.productKind === 'premium_wheel') {
    await patchDepositMeta(order.publicId, { premiumSpin: 'credit' });
    await setTopupOrderMeta(order.publicId, 'premium_spin_credit').catch(() => undefined);
    return (await getDepositByPublicId(order.publicId)) ?? order;
  }

  const amount = order.receivedAmount ?? order.expectedAmount;
  await creditDepositToWallet(order, amount);

  if (order.currency === 'STARS') {
    await applyReferralCashbackStars(order.userId, amount, order.publicId);
  }

  return (await getDepositByPublicId(order.publicId)) ?? order;
}

export function getDepositMethods() {
  return listDepositMethods();
}

export function getStarsPackages() {
  return TOPUP_PACKAGES;
}

export async function createStarsDeposit(args: {
  userId: number;
  packageId: string;
}): Promise<DepositOrderView> {
  const pkg = getTopupPackageById(args.packageId);
  if (!pkg) throw Object.assign(new Error('UNKNOWN_PACKAGE'), { statusCode: 400 });

  const publicId = buildStarsPayload(args.userId, pkg.id);
  const now = Date.now();

  const order = await insertDepositOrder({
    publicId,
    userId: args.userId,
    rail: 'telegram_stars',
    currency: 'STARS',
    productKind: 'wallet_credit',
    expectedAmount: pkg.balanceAmount,
    packageId: pkg.id,
    requiredConfirmations: 1,
    meta: { xtrAmount: pkg.xtrAmount, label: pkg.label },
  });

  // Dual-write legacy topup_orders for existing clients / checkout helpers
  await insertTopupOrder({
    payload: publicId,
    user_id: args.userId,
    package_id: pkg.id,
    xtr_amount: pkg.xtrAmount,
    balance_amount: pkg.balanceAmount,
    created_at: now,
    updated_at: now,
  });

  try {
    const invoiceLink = await createTopupInvoiceLink(args.userId, pkg, publicId);
    return toView(order, { invoiceLink });
  } catch (err) {
    await failDepositOrder(publicId, err instanceof Error ? err.message : 'INVOICE_CREATE_FAILED');
    await failTopupOrder(publicId, err instanceof Error ? err.message : 'INVOICE_CREATE_FAILED');
    throw Object.assign(new Error('INVOICE_CREATE_FAILED'), { statusCode: 500 });
  }
}

export async function createPremiumWheelDeposit(userId: number): Promise<DepositOrderView> {
  const packageId = PREMIUM_WHEEL_PACKAGE_ID;
  const publicId = buildStarsPayload(userId, packageId);
  const now = Date.now();
  const pkg = {
    id: packageId,
    xtrAmount: PREMIUM_WHEEL_XTR,
    balanceAmount: 0,
    label: 'Премиум фортуна ×1',
  };

  const order = await insertDepositOrder({
    publicId,
    userId,
    rail: 'telegram_stars',
    currency: 'STARS',
    productKind: 'premium_wheel',
    expectedAmount: 0,
    packageId,
    requiredConfirmations: 1,
    meta: { xtrAmount: pkg.xtrAmount },
  });

  await insertTopupOrder({
    payload: publicId,
    user_id: userId,
    package_id: packageId,
    xtr_amount: pkg.xtrAmount,
    balance_amount: 0,
    created_at: now,
    updated_at: now,
  });

  try {
    const invoiceLink = await createTopupInvoiceLink(userId, pkg, publicId);
    return toView(order, { invoiceLink });
  } catch (err) {
    await failDepositOrder(publicId, err instanceof Error ? err.message : 'INVOICE_CREATE_FAILED');
    await failTopupOrder(publicId, err instanceof Error ? err.message : 'INVOICE_CREATE_FAILED');
    throw Object.assign(new Error('INVOICE_CREATE_FAILED'), { statusCode: 500 });
  }
}

/**
 * Telegram successful_payment → verify + claim + wallet credit.
 * Returns claimed order or null if ignored / already handled.
 */
export async function confirmStarsPayment(args: {
  payload: string;
  chargeId: string;
  providerChargeId: string | null;
  totalAmountXtr: number;
  payerTelegramId: number;
}): Promise<DepositOrder | null> {
  const order = await getDepositByPublicId(args.payload);
  // Fallback: legacy topup-only orders without deposit row
  if (!order) {
    return confirmLegacyTopupOnly(args);
  }

  if (order.userId !== args.payerTelegramId) return null;
  if (order.rail !== 'telegram_stars') return null;
  if (order.status === 'paid') {
    await finalizeClaimedDeposit(order);
    return order;
  }
  if (order.status !== 'pending' && order.status !== 'confirming') return null;

  const xtrExpected = Number(order.meta.xtrAmount ?? 0);
  if (xtrExpected > 0 && args.totalAmountXtr !== xtrExpected) return null;

  // Claim deposit first
  const claimed = await claimDepositPaid({
    publicId: order.publicId,
    externalId: args.chargeId,
    receivedAmount: order.expectedAmount,
    confirmations: 1,
    meta: {
      providerChargeId: args.providerChargeId,
      xtrPaid: args.totalAmountXtr,
    },
  });
  if (!claimed) return null;

  // Sync legacy topup claim (best-effort)
  await claimTopupPaid(args.payload, args.chargeId, args.providerChargeId).catch(() => null);

  return finalizeClaimedDeposit(claimed);
}

/** Pre-deposit_orders Stars payments still in topup_orders only. */
async function confirmLegacyTopupOnly(args: {
  payload: string;
  chargeId: string;
  providerChargeId: string | null;
  totalAmountXtr: number;
  payerTelegramId: number;
}): Promise<DepositOrder | null> {
  const claimed = await claimTopupPaid(args.payload, args.chargeId, args.providerChargeId);
  if (!claimed) return null;
  if (claimed.user_id !== args.payerTelegramId) return null;
  if (claimed.xtr_amount !== args.totalAmountXtr) return null;

  if (claimed.package_id === PREMIUM_WHEEL_PACKAGE_ID) {
    await setTopupOrderMeta(args.payload, 'premium_spin_credit');
    return null;
  }

  await creditWallet(claimed.user_id, 'STARS', claimed.balance_amount, {
    entryType: 'deposit',
    idempotencyKey: `legacy_topup:${args.payload}`,
    refTable: 'topup_orders',
    refId: args.payload,
  });
  await applyReferralCashbackStars(claimed.user_id, claimed.balance_amount, args.payload);
  return null;
}

export async function createCryptoDeposit(args: {
  userId: number;
  currency: 'TON' | 'USDT_TON';
  amount: number;
}): Promise<DepositOrderView> {
  const address = tonDepositAddress();
  if (!address) {
    throw Object.assign(new Error('CRYPTO_DEPOSIT_DISABLED'), { statusCode: 503 });
  }

  const amount = Math.trunc(Number(args.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw Object.assign(new Error('INVALID_AMOUNT'), { statusCode: 400 });
  }

  const rail: DepositRail = args.currency === 'TON' ? 'ton' : 'usdt_ton';
  let min = args.currency === 'TON' ? minTonNanotons() : minUsdtMicros();
  try {
    const hub = await import('../hub/settings.js');
    min =
      args.currency === 'TON'
        ? await hub.getDepositMinTonNanotons()
        : await hub.getDepositMinUsdtMicros();
  } catch {
    /* hub optional */
  }
  if (amount < min) {
    throw Object.assign(new Error('AMOUNT_BELOW_MIN'), { statusCode: 400 });
  }

  const memo = buildCryptoMemo(args.userId);
  const publicId = `dep_${crypto.randomBytes(12).toString('hex')}`;
  const expiresAt = new Date(Date.now() + cryptoDepositTtlMs()).toISOString();

  const order = await insertDepositOrder({
    publicId,
    userId: args.userId,
    rail,
    currency: args.currency,
    productKind: 'wallet_credit',
    expectedAmount: amount,
    depositAddress: address,
    memo,
    requiredConfirmations: tonConfirmationsRequired(),
    expiresAt,
    meta: {},
  });

  return toView(order);
}

async function maybeExpire(order: DepositOrder): Promise<DepositOrder> {
  if (order.status !== 'pending' && order.status !== 'confirming') return order;
  if (!order.expiresAt) return order;
  if (Date.parse(order.expiresAt) > Date.now()) return order;
  await expireDepositOrder(order.publicId);
  return (await getDepositByPublicId(order.publicId)) ?? { ...order, status: 'expired' };
}

/**
 * Verify on-chain transfer for a crypto deposit and credit wallet when confirmed.
 */
export async function verifyCryptoDeposit(publicId: string, userId?: number): Promise<DepositOrderView> {
  let order = userId
    ? await getDepositForUser(publicId, userId)
    : await getDepositByPublicId(publicId);
  if (!order) {
    throw Object.assign(new Error('NOT_FOUND'), { statusCode: 404 });
  }
  if (order.rail !== 'ton' && order.rail !== 'usdt_ton') {
    throw Object.assign(new Error('NOT_CRYPTO'), { statusCode: 400 });
  }

  order = await maybeExpire(order);
  if (order.status === 'paid') return toView(order);
  if (order.status === 'expired' || order.status === 'failed') return toView(order);

  if (!order.depositAddress || !order.memo) {
    throw Object.assign(new Error('INVALID_ORDER'), { statusCode: 500 });
  }

  const match =
    order.rail === 'ton'
      ? await findTonTransfer({
          toAddress: order.depositAddress,
          memo: order.memo,
          minAmount: order.expectedAmount,
        })
      : await findUsdtTonTransfer({
          toAddress: order.depositAddress,
          memo: order.memo,
          minAmount: order.expectedAmount,
        });

  if (!match) return toView(order);

  if (match.confirmations < order.requiredConfirmations) {
    await markDepositConfirming({
      publicId: order.publicId,
      externalId: match.txHash,
      receivedAmount: match.amount,
      confirmations: match.confirmations,
    });
    const updated = await getDepositByPublicId(order.publicId);
    return toView(updated ?? order);
  }

  const claimed = await claimDepositPaid({
    publicId: order.publicId,
    externalId: match.txHash,
    receivedAmount: match.amount,
    confirmations: match.confirmations,
  });
  if (!claimed) {
    const latest = await getDepositByPublicId(order.publicId);
    return toView(latest ?? order);
  }

  const finalized = await finalizeClaimedDeposit(claimed);
  return toView(finalized);
}

export async function getDepositStatus(
  publicId: string,
  userId: number,
  opts: { verifyCrypto?: boolean } = {},
): Promise<DepositOrderView> {
  let order = await getDepositForUser(publicId, userId);
  if (!order) {
    throw Object.assign(new Error('NOT_FOUND'), { statusCode: 404 });
  }

  if (
    opts.verifyCrypto !== false &&
    (order.rail === 'ton' || order.rail === 'usdt_ton') &&
    (order.status === 'pending' || order.status === 'confirming')
  ) {
    return verifyCryptoDeposit(publicId, userId);
  }

  order = await maybeExpire(order);
  return toView(order);
}

export async function listDeposits(userId: number, opts?: { limit?: number; offset?: number }) {
  const { total, orders } = await listUserDeposits(userId, opts);
  return {
    total,
    deposits: orders.map((o) => toView(o)),
  };
}

export function parseStarsPayload(payload: string): { userId: number; packageId: string } {
  const parts = String(payload ?? '').split(':');
  if (parts.length !== 5 || parts[0] !== 'mg' || parts[1] !== '1') {
    throw new Error('INVALID_PAYLOAD');
  }
  const userId = Number(parts[2]);
  const packageId = parts[3];
  if (!Number.isFinite(userId) || userId <= 0 || !getInvoicePackageById(packageId)) {
    throw new Error('INVALID_PAYLOAD');
  }
  return { userId, packageId };
}

export type { DepositCurrency, DepositOrder, DepositOrderView, DepositRail };
