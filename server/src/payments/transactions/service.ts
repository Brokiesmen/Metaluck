/**
 * Transaction Service — append-only money movement journal.
 * Never updates balances directly; all mutations go through Wallet RPCs / exchange_execute_quote.
 */

import { getSupabase } from '../../supabaseStore.js';
import { getWalletLedger, type WalletLedgerEntry } from '../wallet/index.js';

function throwSb(error: { message?: string } | null, context: string): never {
  throw new Error(`${context}: ${error?.message ?? 'unknown Supabase error'}`);
}

export interface ExchangeOrderRecord {
  id: number;
  quoteId: string;
  userId: number;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  feeAmount: number;
  feeCurrency: string;
  effectiveRate: number;
  createdAt: string;
}

export interface TransactionListItem {
  kind: 'ledger' | 'exchange';
  id: string;
  entryType: string;
  currency?: string;
  direction?: 'credit' | 'debit';
  amount?: number;
  fromCurrency?: string;
  toCurrency?: string;
  fromAmount?: number;
  toAmount?: number;
  feeAmount?: number;
  createdAt: string;
  meta?: Record<string, unknown>;
}

/** Execute atomic exchange via DB RPC (Wallet debit+credit + ledger + order). */
export async function executeExchangeTransaction(
  quoteId: string,
  userId: number,
): Promise<ExchangeOrderRecord> {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('exchange_execute_quote', {
    p_quote_id: quoteId,
    p_user_id: userId,
  });
  if (error) {
    const msg = error.message ?? '';
    if (/insufficient_balance/i.test(msg)) {
      throw Object.assign(new Error('INSUFFICIENT_BALANCE'), { statusCode: 400 });
    }
    if (/quote_expired/i.test(msg)) {
      throw Object.assign(new Error('QUOTE_EXPIRED'), { statusCode: 400 });
    }
    if (/quote_not_found/i.test(msg)) {
      throw Object.assign(new Error('QUOTE_NOT_FOUND'), { statusCode: 404 });
    }
    if (/quote_forbidden/i.test(msg)) {
      throw Object.assign(new Error('QUOTE_FORBIDDEN'), { statusCode: 403 });
    }
    if (/quote_not_open/i.test(msg)) {
      throw Object.assign(new Error('QUOTE_NOT_OPEN'), { statusCode: 400 });
    }
    throwSb(error, 'exchange_execute_quote');
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw Object.assign(new Error('EXECUTE_FAILED'), { statusCode: 500 });
  return {
    id: Number(row.order_id),
    quoteId: String(row.quote_id),
    userId,
    fromCurrency: String(row.from_currency),
    toCurrency: String(row.to_currency),
    fromAmount: Number(row.from_amount),
    toAmount: Number(row.to_amount),
    feeAmount: Number(row.fee_amount),
    feeCurrency: String(row.fee_currency),
    effectiveRate: Number(row.effective_rate),
    createdAt: String(row.created_at),
  };
}

export async function listExchangeOrders(
  userId: number,
  opts: { limit?: number; offset?: number } = {},
): Promise<{ total: number; orders: ExchangeOrderRecord[] }> {
  const limit = Math.min(50, Math.max(1, Math.floor(opts.limit ?? 20)));
  const offset = Math.max(0, Math.floor(opts.offset ?? 0));
  const sb = getSupabase();

  const { count, error: countErr } = await sb
    .from('exchange_orders')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (countErr) throwSb(countErr, 'listExchangeOrders count');

  const { data, error } = await sb
    .from('exchange_orders')
    .select(
      'id, quote_id, user_id, from_currency, to_currency, from_amount, to_amount, fee_amount, fee_currency, effective_rate, created_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throwSb(error, 'listExchangeOrders');

  return {
    total: count ?? 0,
    orders: (data ?? []).map((r) => ({
      id: Number(r.id),
      quoteId: String(r.quote_id),
      userId: Number(r.user_id),
      fromCurrency: String(r.from_currency),
      toCurrency: String(r.to_currency),
      fromAmount: Number(r.from_amount),
      toAmount: Number(r.to_amount),
      feeAmount: Number(r.fee_amount),
      feeCurrency: String(r.fee_currency),
      effectiveRate: Number(r.effective_rate),
      createdAt: String(r.created_at),
    })),
  };
}

/** Unified history: exchange orders + wallet ledger (deposits etc.). */
export async function listUserTransactions(
  userId: number,
  opts: { limit?: number; offset?: number; kind?: 'exchange' | 'ledger' | 'all' } = {},
): Promise<{ total: number; items: TransactionListItem[] }> {
  const kind = opts.kind ?? 'all';
  const limit = Math.min(50, Math.max(1, Math.floor(opts.limit ?? 20)));
  const offset = Math.max(0, Math.floor(opts.offset ?? 0));

  if (kind === 'exchange') {
    const { total, orders } = await listExchangeOrders(userId, { limit, offset });
    return {
      total,
      items: orders.map((o) => ({
        kind: 'exchange' as const,
        id: `ex:${o.id}`,
        entryType: 'exchange',
        fromCurrency: o.fromCurrency,
        toCurrency: o.toCurrency,
        fromAmount: o.fromAmount,
        toAmount: o.toAmount,
        feeAmount: o.feeAmount,
        createdAt: o.createdAt,
        meta: { quoteId: o.quoteId, feeCurrency: o.feeCurrency, rate: o.effectiveRate },
      })),
    };
  }

  if (kind === 'ledger') {
    const { total, entries } = await getWalletLedger(userId, { limit, offset });
    return { total, items: entries.map(ledgerToItem) };
  }

  // Merge recent exchange + ledger (simple: fetch both, sort, page in memory for v1)
  const [ex, led] = await Promise.all([
    listExchangeOrders(userId, { limit: 50, offset: 0 }),
    getWalletLedger(userId, { limit: 50, offset: 0 }),
  ]);
  const items: TransactionListItem[] = [
    ...ex.orders.map((o) => ({
      kind: 'exchange' as const,
      id: `ex:${o.id}`,
      entryType: 'exchange',
      fromCurrency: o.fromCurrency,
      toCurrency: o.toCurrency,
      fromAmount: o.fromAmount,
      toAmount: o.toAmount,
      feeAmount: o.feeAmount,
      createdAt: o.createdAt,
      meta: { quoteId: o.quoteId, feeCurrency: o.feeCurrency, rate: o.effectiveRate },
    })),
    ...led.entries
      .filter((e) => e.entryType !== 'exchange') // avoid duplicate exchange ledger lines in "all"
      .map(ledgerToItem),
  ];
  items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const slice = items.slice(offset, offset + limit);
  return { total: items.length, items: slice };
}

function ledgerToItem(e: WalletLedgerEntry): TransactionListItem {
  return {
    kind: 'ledger',
    id: `led:${e.id}`,
    entryType: e.entryType,
    currency: e.currency,
    direction: e.direction,
    amount: e.amount,
    createdAt: e.createdAt,
    meta: e.meta,
  };
}
