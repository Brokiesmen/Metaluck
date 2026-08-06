/**
 * Transaction Service — crypto deposit / withdraw money paths.
 * All balance mutations go through Wallet RPCs with stable idempotency keys.
 * Never call credit/lock/capture/unlock from crypto modules directly.
 */

import {
  captureLockedWallet,
  creditWallet,
  lockWallet,
  unlockWallet,
  type WalletBalance,
  type WalletCurrency,
} from '../wallet/index.js';
import { writePaymentAudit } from './auditLog.js';

export async function creditCryptoDeposit(args: {
  userId: number;
  currency: WalletCurrency;
  amount: number;
  txHash: string;
  chainTxId: number;
  publicId: string;
  confirmations: number;
  network?: string;
}): Promise<WalletBalance> {
  const network = args.network ?? 'ton';
  if (network !== 'ton') {
    await writePaymentAudit({
      userId: args.userId,
      operation: 'crypto_deposit_credit',
      outcome: 'rejected',
      currency: args.currency,
      amount: args.amount,
      network,
      txHash: args.txHash,
      reason: 'invalid_network',
      refTable: 'crypto_chain_transactions',
      refId: String(args.chainTxId),
    });
    throw new Error('invalid_network');
  }

  const idempotencyKey = `crypto_deposit:ton:${args.txHash}:${args.currency}`;
  try {
    const bal = await creditWallet(args.userId, args.currency, args.amount, {
      entryType: 'deposit',
      idempotencyKey,
      refTable: 'crypto_chain_transactions',
      refId: String(args.chainTxId),
      meta: {
        kind: 'crypto_deposit',
        txHash: args.txHash,
        network: 'ton',
        currency: args.currency,
        amount: args.amount,
        publicId: args.publicId,
        confirmations: args.confirmations,
      },
    });

    await writePaymentAudit({
      userId: args.userId,
      operation: 'crypto_deposit_credit',
      outcome: 'ok',
      currency: args.currency,
      amount: args.amount,
      network: 'ton',
      txHash: args.txHash,
      idempotencyKey,
      refTable: 'crypto_chain_transactions',
      refId: String(args.chainTxId),
      meta: { publicId: args.publicId, confirmations: args.confirmations },
    });

    return bal;
  } catch (err) {
    await writePaymentAudit({
      userId: args.userId,
      operation: 'crypto_deposit_credit',
      outcome: 'failed',
      currency: args.currency,
      amount: args.amount,
      network: 'ton',
      txHash: args.txHash,
      idempotencyKey,
      refTable: 'crypto_chain_transactions',
      refId: String(args.chainTxId),
      reason: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function lockCryptoWithdraw(args: {
  userId: number;
  currency: WalletCurrency;
  amount: number;
  publicId: string;
  withdrawId: number;
  toAddress: string;
  networkFee: number;
  netAmount: number;
}): Promise<WalletBalance | null> {
  const idempotencyKey = `crypto_withdraw_lock:${args.publicId}`;
  try {
    const bal = await lockWallet(args.userId, args.currency, args.amount, {
      entryType: 'withdraw_lock',
      idempotencyKey,
      refTable: 'crypto_withdrawals',
      refId: String(args.withdrawId),
      meta: {
        kind: 'crypto_withdraw',
        publicId: args.publicId,
        toAddress: args.toAddress,
        networkFee: args.networkFee,
        netAmount: args.netAmount,
      },
    });

    if (!bal) {
      await writePaymentAudit({
        userId: args.userId,
        operation: 'crypto_withdraw_lock',
        outcome: 'rejected',
        currency: args.currency,
        amount: args.amount,
        network: 'ton',
        idempotencyKey,
        refTable: 'crypto_withdrawals',
        refId: String(args.withdrawId),
        reason: 'insufficient_balance',
        meta: { publicId: args.publicId },
      });
      return null;
    }

    await writePaymentAudit({
      userId: args.userId,
      operation: 'crypto_withdraw_lock',
      outcome: 'ok',
      currency: args.currency,
      amount: args.amount,
      network: 'ton',
      idempotencyKey,
      refTable: 'crypto_withdrawals',
      refId: String(args.withdrawId),
      meta: { publicId: args.publicId, toAddress: args.toAddress },
    });
    return bal;
  } catch (err) {
    await writePaymentAudit({
      userId: args.userId,
      operation: 'crypto_withdraw_lock',
      outcome: 'failed',
      currency: args.currency,
      amount: args.amount,
      network: 'ton',
      idempotencyKey,
      refTable: 'crypto_withdrawals',
      refId: String(args.withdrawId),
      reason: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function captureCryptoWithdraw(args: {
  userId: number;
  currency: WalletCurrency;
  amount: number;
  publicId: string;
  withdrawId: number;
  txHash: string | null;
}): Promise<WalletBalance> {
  const idempotencyKey = `crypto_withdraw_capture:${args.publicId}`;
  try {
    const bal = await captureLockedWallet(args.userId, args.currency, args.amount, {
      entryType: 'withdraw_capture',
      idempotencyKey,
      refTable: 'crypto_withdrawals',
      refId: String(args.withdrawId),
      meta: {
        kind: 'crypto_withdraw',
        publicId: args.publicId,
        txHash: args.txHash,
      },
    });

    if (!bal) {
      await writePaymentAudit({
        userId: args.userId,
        operation: 'crypto_withdraw_capture',
        outcome: 'reconcile',
        currency: args.currency,
        amount: args.amount,
        network: 'ton',
        txHash: args.txHash,
        idempotencyKey,
        refTable: 'crypto_withdrawals',
        refId: String(args.withdrawId),
        reason: 'capture_returned_null',
        meta: { publicId: args.publicId },
      });
      throw new Error('capture_failed');
    }

    await writePaymentAudit({
      userId: args.userId,
      operation: 'crypto_withdraw_capture',
      outcome: 'ok',
      currency: args.currency,
      amount: args.amount,
      network: 'ton',
      txHash: args.txHash,
      idempotencyKey,
      refTable: 'crypto_withdrawals',
      refId: String(args.withdrawId),
      meta: { publicId: args.publicId },
    });
    return bal;
  } catch (err) {
    if (err instanceof Error && err.message === 'capture_failed') throw err;
    await writePaymentAudit({
      userId: args.userId,
      operation: 'crypto_withdraw_capture',
      outcome: 'failed',
      currency: args.currency,
      amount: args.amount,
      network: 'ton',
      txHash: args.txHash,
      idempotencyKey,
      refTable: 'crypto_withdrawals',
      refId: String(args.withdrawId),
      reason: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/** Unlock only when on-chain send did NOT happen (pre-broadcast failure). */
export async function unlockCryptoWithdraw(args: {
  userId: number;
  currency: WalletCurrency;
  amount: number;
  publicId: string;
  withdrawId: number;
  reason: string;
}): Promise<WalletBalance | null> {
  // Stable key — never suffix with reason (prevents double-unlock races)
  const idempotencyKey = `crypto_withdraw_unlock:${args.publicId}`;
  try {
    const bal = await unlockWallet(args.userId, args.currency, args.amount, {
      entryType: 'withdraw_unlock',
      idempotencyKey,
      refTable: 'crypto_withdrawals',
      refId: String(args.withdrawId),
      meta: { kind: 'crypto_withdraw_refund', reason: args.reason },
    });

    await writePaymentAudit({
      userId: args.userId,
      operation: 'crypto_withdraw_unlock',
      outcome: bal ? 'ok' : 'rejected',
      currency: args.currency,
      amount: args.amount,
      network: 'ton',
      idempotencyKey,
      refTable: 'crypto_withdrawals',
      refId: String(args.withdrawId),
      reason: args.reason,
      meta: { publicId: args.publicId },
    });
    return bal;
  } catch (err) {
    await writePaymentAudit({
      userId: args.userId,
      operation: 'crypto_withdraw_unlock',
      outcome: 'failed',
      currency: args.currency,
      amount: args.amount,
      network: 'ton',
      idempotencyKey,
      refTable: 'crypto_withdrawals',
      refId: String(args.withdrawId),
      reason: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
