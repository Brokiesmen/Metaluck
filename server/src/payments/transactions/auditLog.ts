/**
 * Append-only audit trail for all financial operations.
 * Never throws to callers — logging must not break money paths.
 */

import { getSupabase } from '../../supabaseStore.js';

export type AuditOutcome = 'ok' | 'rejected' | 'failed' | 'skipped' | 'reconcile';

export interface AuditEntry {
  userId?: number | null;
  operation: string;
  outcome: AuditOutcome;
  currency?: string | null;
  amount?: number | null;
  network?: string | null;
  txHash?: string | null;
  idempotencyKey?: string | null;
  refTable?: string | null;
  refId?: string | null;
  reason?: string | null;
  meta?: Record<string, unknown>;
}

export async function writePaymentAudit(entry: AuditEntry): Promise<void> {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('payment_audit_log').insert({
      user_id: entry.userId ?? null,
      operation: entry.operation,
      outcome: entry.outcome,
      currency_code: entry.currency ?? null,
      amount: entry.amount == null ? null : Math.trunc(entry.amount),
      network: entry.network ?? null,
      tx_hash: entry.txHash ?? null,
      idempotency_key: entry.idempotencyKey ?? null,
      ref_table: entry.refTable ?? null,
      ref_id: entry.refId ?? null,
      reason: entry.reason ? String(entry.reason).slice(0, 500) : null,
      meta: entry.meta ?? {},
    });
    if (error) {
      console.error('[payment-audit] insert failed', error.message, entry.operation);
    }
  } catch (err) {
    console.error(
      '[payment-audit] write failed',
      err instanceof Error ? err.message : err,
      entry.operation,
    );
  }

  // Mirror to stdout for ops
  const line = {
    ts: new Date().toISOString(),
    op: entry.operation,
    outcome: entry.outcome,
    userId: entry.userId ?? null,
    currency: entry.currency ?? null,
    amount: entry.amount ?? null,
    txHash: entry.txHash ?? null,
    reason: entry.reason ?? null,
  };
  if (entry.outcome === 'ok') console.log('[payment-audit]', JSON.stringify(line));
  else console.warn('[payment-audit]', JSON.stringify(line));
}
