/**
 * Processes pending crypto withdrawals: send on-chain → save hash → capture funds.
 *
 * Anti double-withdraw:
 * - CAS claim pending → processing
 * - lock already held at create (Transaction Service)
 * - after broadcast: NEVER unlock (needs_reconcile if capture fails)
 */

import { writePaymentAudit } from '../transactions/index.js';
import { sendCryptoWithdrawal } from './tonSender.js';
import {
  captureWithdrawFunds,
  unlockWithdrawFunds,
} from './withdrawService.js';
import {
  claimPendingWithdraw,
  markWithdrawCompleted,
  markWithdrawFailed,
  markWithdrawNeedsReconcile,
} from './withdrawStore.js';
import { isCryptoWithdrawEnabled } from './config.js';

const PRE_BROADCAST_RE =
  /Hot wallet not configured|invalid_net_amount|invalid_amount|Address|parse|jetton|seqno|getSeqno|mnemonic|insufficient/i;

export async function processPendingWithdrawals(): Promise<{
  completed: number;
  failed: number;
  reconcile: number;
}> {
  if (!isCryptoWithdrawEnabled()) return { completed: 0, failed: 0, reconcile: 0 };

  const batch = await claimPendingWithdraw(5);
  let completed = 0;
  let failed = 0;
  let reconcile = 0;

  for (const row of batch) {
    let broadcastHash: string | null = null;
    try {
      await writePaymentAudit({
        userId: row.userId,
        operation: 'crypto_withdraw_send',
        outcome: 'ok',
        currency: row.currency,
        amount: row.netAmount,
        network: 'ton',
        refTable: 'crypto_withdrawals',
        refId: String(row.id),
        meta: { publicId: row.publicId, phase: 'start', toAddress: row.toAddress },
      });

      const sent = await sendCryptoWithdrawal({
        currency: row.currency,
        toAddress: row.toAddress,
        netAmount: row.netAmount,
      });
      broadcastHash = sent.txHash;

      await writePaymentAudit({
        userId: row.userId,
        operation: 'crypto_withdraw_send',
        outcome: 'ok',
        currency: row.currency,
        amount: row.netAmount,
        network: 'ton',
        txHash: sent.txHash,
        refTable: 'crypto_withdrawals',
        refId: String(row.id),
        meta: { publicId: row.publicId, phase: 'broadcast', seqno: sent.seqno },
      });

      const done = await markWithdrawCompleted(row.publicId, sent.txHash);
      if (!done) {
        // Race: another worker — still capture with stable idempotency
        await captureWithdrawFunds({ ...row, txHash: sent.txHash });
        completed += 1;
        continue;
      }

      await captureWithdrawFunds({ ...done });
      completed += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      // If we already broadcast (or got a hash), NEVER unlock — reconcile only
      if (broadcastHash || /capture_failed/i.test(msg)) {
        reconcile += 1;
        await markWithdrawNeedsReconcile(row.publicId, broadcastHash, msg).catch(() => {});
        await writePaymentAudit({
          userId: row.userId,
          operation: 'crypto_withdraw_send',
          outcome: 'reconcile',
          currency: row.currency,
          amount: row.netAmount,
          network: 'ton',
          txHash: broadcastHash,
          refTable: 'crypto_withdrawals',
          refId: String(row.id),
          reason: msg,
          meta: { publicId: row.publicId },
        });
        continue;
      }

      // Pre-broadcast failure — safe to unlock (anti double-spend on retry)
      failed += 1;
      const canUnlock = PRE_BROADCAST_RE.test(msg) || !broadcastHash;
      await markWithdrawFailed(row.publicId, msg).catch(() => {});
      if (canUnlock) {
        await unlockWithdrawFunds(row, msg).catch((e) => {
          console.error('[crypto-withdraw] unlock failed', row.publicId, e);
        });
      }
      await writePaymentAudit({
        userId: row.userId,
        operation: 'crypto_withdraw_send',
        outcome: 'failed',
        currency: row.currency,
        amount: row.netAmount,
        network: 'ton',
        refTable: 'crypto_withdrawals',
        refId: String(row.id),
        reason: msg,
        meta: { publicId: row.publicId, unlocked: canUnlock },
      });
    }
  }

  return { completed, failed, reconcile };
}
