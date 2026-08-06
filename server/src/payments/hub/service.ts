import { getSupabase } from '../../supabaseStore.js';
import {
  creditWallet,
  tryDebitWallet,
  type WalletCurrency,
  isWalletCurrency,
} from '../wallet/index.js';
import {
  listExchangePairsFromDb,
  persistMarketRatesFromUsd,
  loadMarketRatesFromDb,
} from '../rates/store.js';
import { refreshMarketRates, getRatesSnapshot, getRatesRefreshStatus } from '../rates/index.js';
import { cacheSetPairs, cacheSetUsdPrices, cacheSetMeta } from '../rates/cache.js';
import type { RateCurrency, UsdPrices } from '../rates/types.js';
import { EXCHANGE_PAIR_KEYS } from '../rates/config.js';
import { getStarsUsdSetting } from './settings.js';
import { writeAudit } from './auth.js';

function throwSb(error: { message?: string } | null, context: string): never {
  throw new Error(`${context}: ${error?.message ?? 'unknown Supabase error'}`);
}

function throwHttp(statusCode: number, message: string): never {
  throw Object.assign(new Error(message), { statusCode });
}

function asRateCurrency(v: string): RateCurrency {
  if (v === 'STARS' || v === 'TON' || v === 'USDT_TON') return v;
  throwHttp(400, 'INVALID_CURRENCY');
}

/** List all pairs including inactive (admin). */
export async function adminListPairs() {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('exchange_pairs')
    .select(
      'from_currency, to_currency, spread_bps, fee_bps, min_from_amount, max_from_amount, is_active, updated_at',
    )
    .order('from_currency');
  if (error) throwSb(error, 'adminListPairs');
  return (data ?? []).map((r) => ({
    from: String(r.from_currency),
    to: String(r.to_currency),
    spreadBps: Number(r.spread_bps),
    feeBps: Number(r.fee_bps),
    minFromAmount: Number(r.min_from_amount),
    maxFromAmount: Number(r.max_from_amount),
    isActive: Boolean(r.is_active),
    updatedAt: String(r.updated_at),
  }));
}

export async function adminUpdatePair(
  from: string,
  to: string,
  patch: {
    spreadBps?: number;
    feeBps?: number;
    minFromAmount?: number;
    maxFromAmount?: number;
    isActive?: boolean;
  },
  actorId: number | null,
) {
  const f = asRateCurrency(from.toUpperCase());
  const t = asRateCurrency(to.toUpperCase());
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.spreadBps != null) {
    const n = Math.trunc(Number(patch.spreadBps));
    if (!(n >= 0 && n <= 10_000)) throwHttp(400, 'INVALID_SPREAD');
    row.spread_bps = n;
  }
  if (patch.feeBps != null) {
    const n = Math.trunc(Number(patch.feeBps));
    if (!(n >= 0 && n <= 10_000)) throwHttp(400, 'INVALID_FEE');
    row.fee_bps = n;
  }
  if (patch.minFromAmount != null) {
    const n = Math.trunc(Number(patch.minFromAmount));
    if (!(n > 0)) throwHttp(400, 'INVALID_MIN');
    row.min_from_amount = n;
  }
  if (patch.maxFromAmount != null) {
    const n = Math.trunc(Number(patch.maxFromAmount));
    if (!(n > 0)) throwHttp(400, 'INVALID_MAX');
    row.max_from_amount = n;
  }
  if (patch.isActive != null) row.is_active = Boolean(patch.isActive);

  const sb = getSupabase();
  const { data, error } = await sb
    .from('exchange_pairs')
    .update(row)
    .eq('from_currency', f)
    .eq('to_currency', t)
    .select(
      'from_currency, to_currency, spread_bps, fee_bps, min_from_amount, max_from_amount, is_active, updated_at',
    )
    .maybeSingle();
  if (error) throwSb(error, 'adminUpdatePair');
  if (!data) throwHttp(404, 'PAIR_NOT_FOUND');
  await writeAudit({
    actorId,
    action: 'pair.update',
    target: `${f}:${t}`,
    payload: patch as Record<string, unknown>,
  });
  return {
    from: String(data.from_currency),
    to: String(data.to_currency),
    spreadBps: Number(data.spread_bps),
    feeBps: Number(data.fee_bps),
    minFromAmount: Number(data.min_from_amount),
    maxFromAmount: Number(data.max_from_amount),
    isActive: Boolean(data.is_active),
    updatedAt: String(data.updated_at),
  };
}

/** Manual mid override for a pair; recomputes bid/ask from pair spread. */
export async function adminSetManualRate(
  base: string,
  quote: string,
  mid: number,
  actorId: number | null,
) {
  const b = asRateCurrency(base.toUpperCase());
  const q = asRateCurrency(quote.toUpperCase());
  const midN = Number(mid);
  if (!(midN > 0)) throwHttp(400, 'INVALID_RATE');

  const pairs = await listExchangePairsFromDb();
  const pair = pairs.find((p) => p.from === b && p.to === q);
  const spreadBps = pair?.spreadBps ?? 100;
  const half = spreadBps / 20_000;
  const bid = midN * (1 - half);
  const ask = midN * (1 + half);
  const now = new Date().toISOString();

  const sb = getSupabase();
  const { error } = await sb.from('market_rates').upsert(
    {
      base_currency: b,
      quote_currency: q,
      mid: midN,
      bid,
      ask,
      spread_bps: spreadBps,
      source: 'manual',
      fetched_at: now,
      updated_at: now,
    },
    { onConflict: 'base_currency,quote_currency' },
  );
  if (error) throwSb(error, 'adminSetManualRate');

  const rates = await loadMarketRatesFromDb();
  await cacheSetPairs(rates);
  await writeAudit({
    actorId,
    action: 'rate.manual',
    target: `${b}/${q}`,
    payload: { mid: midN, spreadBps },
  });
  return rates.find((r) => r.base === b && r.quote === q) ?? null;
}

export async function adminSetStarsUsd(
  usd: number,
  manual: boolean,
  actorId: number | null,
) {
  const n = Number(usd);
  if (!(n > 0)) throwHttp(400, 'INVALID_STARS_USD');
  const { setHubSetting } = await import('./settings.js');
  await setHubSetting('stars_usd', n, actorId);
  await setHubSetting('stars_usd_manual', manual, actorId);
  await writeAudit({
    actorId,
    action: 'stars_usd.set',
    payload: { usd: n, manual },
  });
  if (manual) {
    // Rebuild pair book from current USD snapshot with new Stars price.
    const snap = await getRatesSnapshot();
    const prices: UsdPrices = {
      STARS: n,
      TON: snap.usd['TON/USD'],
      USDT_TON: snap.usd['USDT/USD'],
      source: 'manual_stars',
      fetchedAt: new Date().toISOString(),
    };
    const pairsCfg = await listExchangePairsFromDb();
    const spreadMap = new Map(pairsCfg.map((p) => [`${p.from}:${p.to}`, p.spreadBps]));
    const pairs = await persistMarketRatesFromUsd(prices, spreadMap);
    await cacheSetUsdPrices(prices);
    await cacheSetPairs(pairs);
    await cacheSetMeta({
      lastRefreshAt: Date.now(),
      lastError: null,
      source: prices.source,
    });
  }
  return getStarsUsdSetting();
}

export async function adminRefreshRates(actorId: number | null) {
  const rates = await refreshMarketRates(true);
  await writeAudit({ actorId, action: 'rates.refresh' });
  return { rates, ...getRatesRefreshStatus() };
}

export async function adminListDeposits(opts: {
  status?: string;
  userId?: number;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(100, Math.max(1, Math.floor(opts.limit ?? 30)));
  const offset = Math.max(0, Math.floor(opts.offset ?? 0));
  const sb = getSupabase();
  let q = sb
    .from('deposit_orders')
    .select(
      'id, public_id, user_id, rail, currency_code, expected_amount, received_amount, status, package_id, created_at, updated_at, error_message',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (opts.status) q = q.eq('status', opts.status);
  if (opts.userId != null) q = q.eq('user_id', opts.userId);
  const { data, error, count } = await q;
  if (error) throwSb(error, 'adminListDeposits');
  return {
    total: count ?? 0,
    items: (data ?? []).map((r) => ({
      id: Number(r.id),
      publicId: String(r.public_id),
      userId: Number(r.user_id),
      rail: String(r.rail),
      currency: String(r.currency_code),
      expectedAmount: Number(r.expected_amount),
      receivedAmount: r.received_amount == null ? null : Number(r.received_amount),
      status: String(r.status),
      packageId: r.package_id != null ? String(r.package_id) : null,
      errorMessage: r.error_message != null ? String(r.error_message) : null,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    })),
  };
}

export async function adminListWithdrawals(opts: {
  status?: string;
  userId?: number;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(100, Math.max(1, Math.floor(opts.limit ?? 30)));
  const offset = Math.max(0, Math.floor(opts.offset ?? 0));
  const sb = getSupabase();
  let q = sb
    .from('withdraw_orders')
    .select('id, user_id, amount, status, username, display_name, created_at, updated_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (opts.status) q = q.eq('status', opts.status);
  if (opts.userId != null) q = q.eq('user_id', opts.userId);
  const { data, error, count } = await q;
  if (error) throwSb(error, 'adminListWithdrawals');
  return {
    total: count ?? 0,
    items: (data ?? []).map((r) => ({
      id: Number(r.id),
      userId: Number(r.user_id),
      amount: Number(r.amount),
      status: String(r.status),
      username: r.username != null ? String(r.username) : null,
      displayName: r.display_name != null ? String(r.display_name) : null,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
    })),
  };
}

export async function adminUpdateWithdrawStatus(
  orderId: number,
  status: 'paid' | 'rejected',
  actorId: number | null,
) {
  if (status !== 'paid' && status !== 'rejected') throwHttp(400, 'INVALID_STATUS');
  const sb = getSupabase();
  const { data: existing, error: getErr } = await sb
    .from('withdraw_orders')
    .select('id, user_id, amount, status')
    .eq('id', orderId)
    .maybeSingle();
  if (getErr) throwSb(getErr, 'adminUpdateWithdraw get');
  if (!existing) throwHttp(404, 'NOT_FOUND');

  const prev = String(existing.status);
  if (prev === status) {
    return { id: orderId, status, refunded: false };
  }

  // Strict FSM: only pending → paid | rejected. CAS then side-effects.
  if (prev !== 'pending') {
    throwHttp(400, 'INVALID_TRANSITION');
  }

  const now = Date.now();
  const { data: updated, error } = await sb
    .from('withdraw_orders')
    .update({ status, updated_at: now })
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (error) throwSb(error, 'adminUpdateWithdraw');
  if (!updated) throwHttp(409, 'CONCURRENT_UPDATE');

  let refunded = false;
  if (status === 'rejected') {
    await creditWallet(Number(existing.user_id), 'STARS', Number(existing.amount), {
      entryType: 'withdraw_refund',
      refTable: 'withdraw_orders',
      refId: String(orderId),
      idempotencyKey: `withdraw_refund:${orderId}`,
      meta: { actorId },
    });
    refunded = true;
  }

  await writeAudit({
    actorId,
    action: 'withdraw.status',
    target: String(orderId),
    payload: { from: prev, to: status, refunded },
  });
  return { id: orderId, status, refunded };
}

export async function adminListExchanges(opts: {
  userId?: number;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(100, Math.max(1, Math.floor(opts.limit ?? 30)));
  const offset = Math.max(0, Math.floor(opts.offset ?? 0));
  const sb = getSupabase();
  let q = sb
    .from('exchange_orders')
    .select(
      'id, quote_id, user_id, from_currency, to_currency, from_amount, to_amount, fee_amount, fee_currency, effective_rate, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (opts.userId != null) q = q.eq('user_id', opts.userId);
  const { data, error, count } = await q;
  if (error) throwSb(error, 'adminListExchanges');
  return {
    total: count ?? 0,
    items: (data ?? []).map((r) => ({
      id: Number(r.id),
      quoteId: String(r.quote_id),
      userId: Number(r.user_id),
      from: String(r.from_currency),
      to: String(r.to_currency),
      fromAmount: Number(r.from_amount),
      toAmount: Number(r.to_amount),
      feeAmount: Number(r.fee_amount),
      feeCurrency: String(r.fee_currency),
      effectiveRate: Number(r.effective_rate),
      createdAt: String(r.created_at),
    })),
  };
}

export async function adminListLedger(opts: {
  userId?: number;
  currency?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(100, Math.max(1, Math.floor(opts.limit ?? 30)));
  const offset = Math.max(0, Math.floor(opts.offset ?? 0));
  const sb = getSupabase();
  let q = sb
    .from('wallet_ledger')
    .select(
      'id, user_id, currency_code, direction, amount, entry_type, ref_table, ref_id, meta, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (opts.userId != null) q = q.eq('user_id', opts.userId);
  if (opts.currency) q = q.eq('currency_code', opts.currency);
  const { data, error, count } = await q;
  if (error) throwSb(error, 'adminListLedger');
  return {
    total: count ?? 0,
    items: (data ?? []).map((r) => ({
      id: Number(r.id),
      userId: Number(r.user_id),
      currency: String(r.currency_code),
      direction: String(r.direction),
      amount: Number(r.amount),
      entryType: String(r.entry_type),
      refTable: r.ref_table != null ? String(r.ref_table) : null,
      refId: r.ref_id != null ? String(r.ref_id) : null,
      meta: (r.meta && typeof r.meta === 'object' ? r.meta : {}) as Record<string, unknown>,
      createdAt: String(r.created_at),
    })),
  };
}

export async function adminSearchUser(q: string) {
  const query = String(q ?? '').trim();
  if (!query) throwHttp(400, 'EMPTY_QUERY');
  const sb = getSupabase();

  const asId = Number(query);
  const results: Array<{
    userId: number;
    name: string | null;
    photoUrl: string | null;
    username: string | null;
  }> = [];

  if (Number.isFinite(asId) && asId >= 0) {
    const { data } = await sb
      .from('user_profiles')
      .select('user_id, name, photo_url')
      .eq('user_id', Math.trunc(asId))
      .maybeSingle();
    if (data) {
      results.push({
        userId: Number(data.user_id),
        name: data.name != null ? String(data.name) : null,
        photoUrl: data.photo_url != null ? String(data.photo_url) : null,
        username: null,
      });
    } else if (asId === Math.trunc(asId)) {
      results.push({ userId: Math.trunc(asId), name: null, photoUrl: null, username: null });
    }
  }

  const uname = query.replace(/^@/, '').toLowerCase();
  if (uname) {
    const { data: w } = await sb
      .from('withdraw_orders')
      .select('user_id, username, display_name')
      .ilike('username', `%${uname}%`)
      .limit(20);
    for (const row of w ?? []) {
      const uid = Number(row.user_id);
      if (results.some((r) => r.userId === uid)) continue;
      results.push({
        userId: uid,
        name: row.display_name != null ? String(row.display_name) : null,
        photoUrl: null,
        username: row.username != null ? String(row.username) : null,
      });
    }

    const { data: profiles } = await sb
      .from('user_profiles')
      .select('user_id, name, photo_url')
      .ilike('name', `%${query}%`)
      .limit(20);
    for (const row of profiles ?? []) {
      const uid = Number(row.user_id);
      if (results.some((r) => r.userId === uid)) continue;
      results.push({
        userId: uid,
        name: row.name != null ? String(row.name) : null,
        photoUrl: row.photo_url != null ? String(row.photo_url) : null,
        username: null,
      });
    }
  }

  const slice = results.slice(0, 30);
  const ids = slice.map((r) => r.userId);
  const { data: walletRows, error: wErr } = await sb
    .from('wallets')
    .select('user_id, currency_code, available, locked')
    .in('user_id', ids);
  if (wErr) throwSb(wErr, 'adminSearchUser wallets');

  const byUser = new Map<number, typeof walletRows>();
  for (const row of walletRows ?? []) {
    const uid = Number(row.user_id);
    const list = byUser.get(uid) ?? [];
    list.push(row);
    byUser.set(uid, list);
  }

  const { WALLET_CATALOG } = await import('../wallet/catalog.js');
  const enriched = slice.map((r) => {
    const rows = byUser.get(r.userId) ?? [];
    const balances = (['STARS', 'TON', 'USDT_TON'] as const).map((code) => {
      const hit = rows.find((x) => String(x.currency_code) === code);
      const info = WALLET_CATALOG[code];
      return {
        currency: code,
        available: hit ? Number(hit.available) : 0,
        locked: hit ? Number(hit.locked) : 0,
        decimals: info.decimals,
        displaySymbol: info.displaySymbol,
      };
    });
    return { ...r, balances };
  });
  return { users: enriched };
}

export async function adminManualCredit(args: {
  userId: number;
  currency: string;
  amount: number;
  reason?: string;
  actorId: number | null;
}) {
  const currency = args.currency.toUpperCase();
  if (!isWalletCurrency(currency)) throwHttp(400, 'INVALID_CURRENCY');
  const amount = Math.trunc(Number(args.amount));
  if (!(amount > 0)) throwHttp(400, 'INVALID_AMOUNT');
  const bal = await creditWallet(args.userId, currency as WalletCurrency, amount, {
    entryType: 'admin_credit',
    idempotencyKey: `admin_credit:${args.actorId ?? 0}:${args.userId}:${currency}:${amount}:${String(args.reason ?? '').slice(0, 64)}`,
    meta: { actorId: args.actorId, reason: args.reason ?? '' },
  });
  await writeAudit({
    actorId: args.actorId,
    action: 'wallet.credit',
    target: String(args.userId),
    payload: { currency, amount, reason: args.reason ?? '' },
  });
  return bal;
}

export async function adminManualDebit(args: {
  userId: number;
  currency: string;
  amount: number;
  reason?: string;
  actorId: number | null;
}) {
  const currency = args.currency.toUpperCase();
  if (!isWalletCurrency(currency)) throwHttp(400, 'INVALID_CURRENCY');
  const amount = Math.trunc(Number(args.amount));
  if (!(amount > 0)) throwHttp(400, 'INVALID_AMOUNT');
  const bal = await tryDebitWallet(args.userId, currency as WalletCurrency, amount, {
    entryType: 'admin_debit',
    idempotencyKey: `admin_debit:${args.actorId ?? 0}:${args.userId}:${currency}:${amount}:${String(args.reason ?? '').slice(0, 64)}`,
    meta: { actorId: args.actorId, reason: args.reason ?? '' },
  });
  if (!bal) throwHttp(400, 'INSUFFICIENT_BALANCE');
  await writeAudit({
    actorId: args.actorId,
    action: 'wallet.debit',
    target: String(args.userId),
    payload: { currency, amount, reason: args.reason ?? '' },
  });
  return bal;
}

export async function adminExchangeProfitStats(opts: { from?: string; to?: string } = {}) {
  const sb = getSupabase();
  let q = sb
    .from('exchange_orders')
    .select('fee_amount, fee_currency, from_currency, to_currency, created_at');
  if (opts.from) q = q.gte('created_at', opts.from);
  if (opts.to) q = q.lte('created_at', opts.to);
  const { data, error } = await q;
  if (error) throwSb(error, 'adminExchangeProfit');

  const byFeeCurrency: Record<string, number> = {};
  const byPair: Record<string, { count: number; feeByCurrency: Record<string, number> }> = {};
  let count = 0;

  for (const r of data ?? []) {
    count += 1;
    const feeCur = String(r.fee_currency);
    const feeAmt = Number(r.fee_amount) || 0;
    byFeeCurrency[feeCur] = (byFeeCurrency[feeCur] ?? 0) + feeAmt;
    const pair = `${r.from_currency}/${r.to_currency}`;
    if (!byPair[pair]) byPair[pair] = { count: 0, feeByCurrency: {} };
    byPair[pair].count += 1;
    byPair[pair].feeByCurrency[feeCur] = (byPair[pair].feeByCurrency[feeCur] ?? 0) + feeAmt;
  }

  return {
    orderCount: count,
    feeTotals: byFeeCurrency,
    byPair,
    pairKeys: EXCHANGE_PAIR_KEYS.map(([a, b]) => `${a}/${b}`),
  };
}
