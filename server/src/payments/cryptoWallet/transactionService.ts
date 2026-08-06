/**
 * Crypto Deposit System — validation + credit via Transaction Service.
 *
 * Public statuses: pending → confirmed | failed
 * Protections: unique hash, verifyTransaction, network/address/amount checks,
 * idempotent credit, no permanent fail on transient errors.
 */

import { blockchainService } from '../blockchain/index.js';
import { creditCryptoDeposit, writePaymentAudit } from '../transactions/index.js';
import { getSupabase } from '../../supabaseStore.js';
import { addressesEqual } from './address.js';
import {
  minTonNanotons,
  minUsdtMicros,
  resolveConfirmationsRequired,
  resolveMinTonNanotons,
  resolveMinUsdtMicros,
  type CryptoCurrency,
} from './config.js';
import {
  claimCredit,
  listPendingCredits,
  markTxFailed,
  upsertDetectedTransfer,
  type ChainTxRow,
  type DepositAddressRow,
} from './store.js';
import type { ObservedTransfer } from './tonScanner.js';

export type DepositPublicStatus = 'pending' | 'confirmed' | 'failed';

const TX_HASH_RE = /^[a-zA-Z0-9:_-]{8,200}$/;

const TRANSIENT_RE =
  /timeout|ECONN|ENOTFOUND|429|503|502|rate.?limit|fetch failed|network|temporarily/i;

const PERMANENT_FAIL = new Set([
  'invalid_tx_hash',
  'invalid_network',
  'invalid_currency',
  'invalid_amount',
  'below_minimum',
  'address_mismatch',
  'currency_mismatch',
  'amount_mismatch',
  'amount_below_expected',
  'from_mismatch',
  'comment_mismatch',
  'transaction_not_found',
  'verify_failed',
]);

function minForSync(currency: CryptoCurrency): number {
  return currency === 'TON' ? minTonNanotons() : minUsdtMicros();
}

async function minFor(currency: CryptoCurrency): Promise<number> {
  return currency === 'TON' ? resolveMinTonNanotons() : resolveMinUsdtMicros();
}

export function isCryptoCurrency(v: unknown): v is CryptoCurrency {
  return v === 'TON' || v === 'USDT_TON';
}

export function toPublicStatus(status: string): DepositPublicStatus {
  if (status === 'confirmed' || status === 'credited') return 'confirmed';
  if (status === 'failed' || status === 'ignored') return 'failed';
  return 'pending';
}

/** Validate inbound transfer before it becomes a deposit Transaction row. */
export function validateObservedTransfer(
  transfer: ObservedTransfer,
  address: DepositAddressRow,
): { ok: true } | { ok: false; reason: string } {
  if (!transfer.txHash || !TX_HASH_RE.test(transfer.txHash)) {
    return { ok: false, reason: 'invalid_tx_hash' };
  }
  if (!isCryptoCurrency(transfer.currency)) {
    return { ok: false, reason: 'invalid_currency' };
  }
  if (!(transfer.amount > 0) || !Number.isFinite(transfer.amount)) {
    return { ok: false, reason: 'invalid_amount' };
  }
  if (transfer.amount < minForSync(transfer.currency)) {
    return { ok: false, reason: 'below_minimum' };
  }
  // Network is TON-only — reject wrong destination address
  if (!addressesEqual(transfer.toAddress, address.address)) {
    return { ok: false, reason: 'address_mismatch' };
  }
  return { ok: true };
}

/**
 * Ingest chain transfers → deposit rows (status=pending).
 * Duplicate-safe via unique (network, tx_hash, currency).
 */
export async function ingestTransfers(
  address: DepositAddressRow,
  transfers: ObservedTransfer[],
): Promise<ChainTxRow[]> {
  const required = await resolveConfirmationsRequired();
  const out: ChainTxRow[] = [];

  for (const t of transfers) {
    const check = validateObservedTransfer(t, address);
    if (!check.ok) {
      await writePaymentAudit({
        userId: address.userId,
        operation: 'crypto_deposit_ingest',
        outcome: 'rejected',
        currency: t.currency,
        amount: t.amount,
        network: 'ton',
        txHash: t.txHash,
        reason: check.reason,
        meta: { toAddress: t.toAddress, depositAddress: address.address },
      });
      continue;
    }

    // Re-check min against hub settings (validate uses env sync fallback)
    const hubMin = await minFor(t.currency);
    if (t.amount < hubMin) {
      await writePaymentAudit({
        userId: address.userId,
        operation: 'crypto_deposit_ingest',
        outcome: 'rejected',
        currency: t.currency,
        amount: t.amount,
        network: 'ton',
        txHash: t.txHash,
        reason: 'below_minimum',
      });
      continue;
    }

    try {
      const row = await upsertDetectedTransfer({
        userId: address.userId,
        depositAddressId: address.id,
        currency: t.currency,
        txHash: t.txHash,
        lt: t.lt,
        fromAddress: t.fromAddress,
        toAddress: address.address,
        amount: Math.trunc(t.amount),
        confirmations: t.confirmations,
        requiredConfirmations: required,
        memo: t.comment,
      });
      out.push(row);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/duplicate|unique/i.test(msg)) {
        await writePaymentAudit({
          userId: address.userId,
          operation: 'crypto_deposit_ingest',
          outcome: 'skipped',
          currency: t.currency,
          amount: t.amount,
          network: 'ton',
          txHash: t.txHash,
          reason: 'duplicate_tx_hash',
        });
        continue;
      }
      throw err;
    }
  }
  return out;
}

async function markConfirmed(publicId: string): Promise<boolean> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('crypto_chain_transactions')
    .update({
      status: 'confirmed',
      credited_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('public_id', publicId)
    .in('status', ['pending', 'detected', 'confirming'])
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`markConfirmed: ${error.message}`);
  return Boolean(data);
}

async function assertReadyToCredit(tx: ChainTxRow): Promise<void> {
  if (!TX_HASH_RE.test(tx.txHash)) throw new Error('invalid_tx_hash');
  if (tx.network !== 'ton') throw new Error('invalid_network');
  if (!isCryptoCurrency(tx.currency)) throw new Error('invalid_currency');
  if (!(tx.amount > 0) || !Number.isFinite(tx.amount)) throw new Error('invalid_amount');
  if (tx.amount < (await minFor(tx.currency))) throw new Error('below_minimum');
  if (tx.confirmations < tx.requiredConfirmations) throw new Error('insufficient_confirmations');
}

/**
 * Re-verify on-chain before crediting — blocks fake / wrong-network / wrong-amount txs.
 */
async function verifyDepositOnChain(tx: ChainTxRow): Promise<void> {
  const result = await blockchainService.verifyTransaction({
    txHash: tx.txHash,
    accountAddress: tx.toAddress,
    expectedTo: tx.toAddress,
    expectedCurrency: tx.currency,
    expectedAmount: tx.amount,
    amountMode: 'exact',
    minConfirmations: tx.requiredConfirmations,
  });

  if (!result.ok) {
    await writePaymentAudit({
      userId: tx.userId,
      operation: 'crypto_deposit_verify',
      outcome: 'rejected',
      currency: tx.currency,
      amount: tx.amount,
      network: 'ton',
      txHash: tx.txHash,
      reason: result.reason ?? 'verify_failed',
      refTable: 'crypto_chain_transactions',
      refId: String(tx.id),
      meta: { publicId: tx.publicId },
    });
    throw new Error(result.reason ?? 'verify_failed');
  }

  await writePaymentAudit({
    userId: tx.userId,
    operation: 'crypto_deposit_verify',
    outcome: 'ok',
    currency: tx.currency,
    amount: tx.amount,
    network: 'ton',
    txHash: tx.txHash,
    refTable: 'crypto_chain_transactions',
    refId: String(tx.id),
    meta: { publicId: tx.publicId, confirmations: result.transaction?.confirmations },
  });
}

/**
 * After enough confirmations: verify chain → credit via Transaction Service → mark confirmed.
 * Idempotency key prevents double credit for the same hash.
 */
export async function processPendingCredits(): Promise<{ credited: number; failed: number }> {
  const pending = await listPendingCredits(80);
  let credited = 0;
  let failed = 0;

  for (const tx of pending) {
    if (toPublicStatus(tx.status) !== 'pending') continue;
    if (tx.confirmations < tx.requiredConfirmations) continue;

    try {
      await assertReadyToCredit(tx);
      await verifyDepositOnChain(tx);

      // All money movement through Transaction Service
      await creditCryptoDeposit({
        userId: tx.userId,
        currency: tx.currency,
        amount: tx.amount,
        txHash: tx.txHash,
        chainTxId: tx.id,
        publicId: tx.publicId,
        confirmations: tx.confirmations,
        network: tx.network,
      });

      const claimed = await claimCredit(tx.publicId);
      if (claimed && toPublicStatus(claimed.status) === 'confirmed') {
        credited += 1;
      } else {
        const ok = await markConfirmed(tx.publicId);
        if (ok) credited += 1;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      if (msg === 'insufficient_confirmations' || TRANSIENT_RE.test(msg)) {
        await writePaymentAudit({
          userId: tx.userId,
          operation: 'crypto_deposit_credit',
          outcome: 'skipped',
          currency: tx.currency,
          amount: tx.amount,
          network: 'ton',
          txHash: tx.txHash,
          reason: msg,
          refId: String(tx.id),
        });
        continue;
      }

      failed += 1;
      if (PERMANENT_FAIL.has(msg) || msg.includes('mismatch') || msg.includes('not_found')) {
        await markTxFailed(tx.publicId, msg).catch(() => {});
        await writePaymentAudit({
          userId: tx.userId,
          operation: 'crypto_deposit_fail',
          outcome: 'failed',
          currency: tx.currency,
          amount: tx.amount,
          network: 'ton',
          txHash: tx.txHash,
          reason: msg,
          refTable: 'crypto_chain_transactions',
          refId: String(tx.id),
        });
      } else {
        // Unknown / possibly transient — leave pending for retry
        await writePaymentAudit({
          userId: tx.userId,
          operation: 'crypto_deposit_credit',
          outcome: 'skipped',
          currency: tx.currency,
          amount: tx.amount,
          network: 'ton',
          txHash: tx.txHash,
          reason: `retryable:${msg}`,
          refId: String(tx.id),
        });
      }
    }
  }

  return { credited, failed };
}

export function toTxView(tx: ChainTxRow) {
  return {
    id: tx.publicId,
    currency: tx.currency,
    network: tx.network,
    amount: tx.amount,
    txHash: tx.txHash,
    confirmations: tx.confirmations,
    requiredConfirmations: tx.requiredConfirmations,
    status: toPublicStatus(tx.status),
    detectedAt: tx.detectedAt,
    creditedAt: tx.creditedAt,
    errorMessage: tx.errorMessage,
  };
}
