import { getSupabase } from '../../supabaseStore.js';
import { WALLET_CATALOG, catalogList } from './catalog.js';
import {
  isWalletCurrency,
  type WalletBalance,
  type WalletCurrency,
  type WalletLedgerEntry,
  type WalletMutationMeta,
  type WalletSnapshot,
} from './types.js';

function throwSb(error: { message?: string } | null, context: string): never {
  throw new Error(`${context}: ${error?.message ?? 'unknown Supabase error'}`);
}

function asAmount(n: unknown): number {
  const v = typeof n === 'bigint' ? Number(n) : Number(n);
  if (!Number.isFinite(v) || v < 0) throw new Error('invalid wallet amount');
  return Math.trunc(v);
}

function parseRpcRow(data: unknown): { available: number; locked: number } | null {
  if (data == null) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;
  const r = row as { available?: unknown; locked?: unknown };
  if (r.available == null) return null;
  return { available: asAmount(r.available), locked: asAmount(r.locked ?? 0) };
}

function toBalance(currency: WalletCurrency, available: number, locked: number): WalletBalance {
  const info = WALLET_CATALOG[currency];
  return {
    currency,
    available,
    locked,
    decimals: info.decimals,
    displaySymbol: info.displaySymbol,
  };
}

export async function ensureUserWallets(userId: number): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.rpc('wallet_ensure', { p_user_id: userId });
  if (error) throwSb(error, 'wallet_ensure');
}

export async function getWalletSnapshot(userId: number): Promise<WalletSnapshot> {
  await ensureUserWallets(userId);
  const sb = getSupabase();
  const { data, error } = await sb
    .from('wallets')
    .select('currency_code, available, locked')
    .eq('user_id', userId)
    .in('currency_code', ['STARS', 'TON', 'USDT_TON']);
  if (error) throwSb(error, 'getWalletSnapshot');

  const byCode = new Map<string, { available: number; locked: number }>();
  for (const row of data ?? []) {
    byCode.set(String(row.currency_code), {
      available: asAmount(row.available),
      locked: asAmount(row.locked),
    });
  }

  const balances: WalletBalance[] = catalogList().map((c) => {
    const row = byCode.get(c.code) ?? { available: 0, locked: 0 };
    return toBalance(c.code, row.available, row.locked);
  });

  return { userId, balances };
}

export async function getWalletBalance(
  userId: number,
  currency: WalletCurrency,
): Promise<WalletBalance> {
  await ensureUserWallets(userId);
  const sb = getSupabase();
  const { data, error } = await sb.rpc('wallet_get', {
    p_user_id: userId,
    p_currency: currency,
  });
  if (error) throwSb(error, 'wallet_get');
  const row = parseRpcRow(data) ?? { available: 0, locked: 0 };
  return toBalance(currency, row.available, row.locked);
}

export async function creditWallet(
  userId: number,
  currency: WalletCurrency,
  amount: number,
  opts: WalletMutationMeta = {},
): Promise<WalletBalance> {
  const amt = asAmount(amount);
  if (amt <= 0) throw new Error('credit amount must be > 0');
  const sb = getSupabase();
  const { data, error } = await sb.rpc('wallet_credit', {
    p_user_id: userId,
    p_currency: currency,
    p_amount: amt,
    p_entry_type: opts.entryType ?? 'credit',
    p_idempotency_key: opts.idempotencyKey ?? null,
    p_ref_table: opts.refTable ?? null,
    p_ref_id: opts.refId ?? null,
    p_meta: opts.meta ?? {},
  });
  if (error) throwSb(error, 'wallet_credit');
  const row = parseRpcRow(data);
  if (!row) throw new Error('wallet_credit: empty result');
  return toBalance(currency, row.available, row.locked);
}

/** Returns null when insufficient available funds. */
export async function tryDebitWallet(
  userId: number,
  currency: WalletCurrency,
  amount: number,
  opts: WalletMutationMeta = {},
): Promise<WalletBalance | null> {
  const amt = asAmount(amount);
  const sb = getSupabase();
  const { data, error } = await sb.rpc('wallet_try_debit', {
    p_user_id: userId,
    p_currency: currency,
    p_amount: amt,
    p_entry_type: opts.entryType ?? 'debit',
    p_idempotency_key: opts.idempotencyKey ?? null,
    p_ref_table: opts.refTable ?? null,
    p_ref_id: opts.refId ?? null,
    p_meta: opts.meta ?? {},
  });
  if (error) throwSb(error, 'wallet_try_debit');
  const row = parseRpcRow(data);
  if (!row) return null;
  return toBalance(currency, row.available, row.locked);
}

/** Reserve funds: available → locked. Null if not enough available. */
export async function lockWallet(
  userId: number,
  currency: WalletCurrency,
  amount: number,
  opts: WalletMutationMeta = {},
): Promise<WalletBalance | null> {
  const amt = asAmount(amount);
  if (amt <= 0) throw new Error('lock amount must be > 0');
  const sb = getSupabase();
  const { data, error } = await sb.rpc('wallet_lock', {
    p_user_id: userId,
    p_currency: currency,
    p_amount: amt,
    p_entry_type: opts.entryType ?? 'lock',
    p_idempotency_key: opts.idempotencyKey ?? null,
    p_ref_table: opts.refTable ?? null,
    p_ref_id: opts.refId ?? null,
    p_meta: opts.meta ?? {},
  });
  if (error) throwSb(error, 'wallet_lock');
  const row = parseRpcRow(data);
  if (!row) return null;
  return toBalance(currency, row.available, row.locked);
}

/** Release reserved funds back to available. */
export async function unlockWallet(
  userId: number,
  currency: WalletCurrency,
  amount: number,
  opts: WalletMutationMeta = {},
): Promise<WalletBalance | null> {
  const amt = asAmount(amount);
  if (amt <= 0) throw new Error('unlock amount must be > 0');
  const sb = getSupabase();
  const { data, error } = await sb.rpc('wallet_unlock', {
    p_user_id: userId,
    p_currency: currency,
    p_amount: amt,
    p_entry_type: opts.entryType ?? 'unlock',
    p_idempotency_key: opts.idempotencyKey ?? null,
    p_ref_table: opts.refTable ?? null,
    p_ref_id: opts.refId ?? null,
    p_meta: opts.meta ?? {},
  });
  if (error) throwSb(error, 'wallet_unlock');
  const row = parseRpcRow(data);
  if (!row) return null;
  return toBalance(currency, row.available, row.locked);
}

/** Finalize reserved funds (withdraw sent). */
export async function captureLockedWallet(
  userId: number,
  currency: WalletCurrency,
  amount: number,
  opts: WalletMutationMeta = {},
): Promise<WalletBalance | null> {
  const amt = asAmount(amount);
  if (amt <= 0) throw new Error('capture amount must be > 0');
  const sb = getSupabase();
  const { data, error } = await sb.rpc('wallet_capture_locked', {
    p_user_id: userId,
    p_currency: currency,
    p_amount: amt,
    p_entry_type: opts.entryType ?? 'withdraw_capture',
    p_idempotency_key: opts.idempotencyKey ?? null,
    p_ref_table: opts.refTable ?? null,
    p_ref_id: opts.refId ?? null,
    p_meta: opts.meta ?? {},
  });
  if (error) throwSb(error, 'wallet_capture_locked');
  const row = parseRpcRow(data);
  if (!row) return null;
  return toBalance(currency, row.available, row.locked);
}

export async function getWalletLedger(
  userId: number,
  opts: { currency?: WalletCurrency; limit?: number; offset?: number } = {},
): Promise<{ total: number; entries: WalletLedgerEntry[] }> {
  const limit = Math.min(100, Math.max(1, Math.floor(opts.limit ?? 20)));
  const offset = Math.max(0, Math.floor(opts.offset ?? 0));
  const sb = getSupabase();

  let countQuery = sb
    .from('wallet_ledger')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (opts.currency) countQuery = countQuery.eq('currency_code', opts.currency);
  const { count, error: countErr } = await countQuery;
  if (countErr) throwSb(countErr, 'wallet_ledger count');

  let q = sb
    .from('wallet_ledger')
    .select(
      'id, user_id, currency_code, direction, amount, available_after, locked_after, entry_type, idempotency_key, ref_table, ref_id, meta, created_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (opts.currency) q = q.eq('currency_code', opts.currency);

  const { data, error } = await q;
  if (error) throwSb(error, 'wallet_ledger select');

  const entries: WalletLedgerEntry[] = (data ?? []).map((r) => {
    const code = String(r.currency_code);
    if (!isWalletCurrency(code)) {
      // Should not happen for v1 rows; skip unsafe casts.
      throw new Error(`unexpected currency in ledger: ${code}`);
    }
    return {
      id: Number(r.id),
      userId: Number(r.user_id),
      currency: code,
      direction: r.direction === 'credit' ? 'credit' : 'debit',
      amount: asAmount(r.amount),
      availableAfter: asAmount(r.available_after),
      lockedAfter: asAmount(r.locked_after),
      entryType: String(r.entry_type),
      idempotencyKey: r.idempotency_key != null ? String(r.idempotency_key) : null,
      refTable: r.ref_table != null ? String(r.ref_table) : null,
      refId: r.ref_id != null ? String(r.ref_id) : null,
      meta: (r.meta && typeof r.meta === 'object' ? r.meta : {}) as Record<string, unknown>,
      createdAt: String(r.created_at),
    };
  });

  return { total: count ?? 0, entries };
}

export { catalogList, isWalletCurrency };
