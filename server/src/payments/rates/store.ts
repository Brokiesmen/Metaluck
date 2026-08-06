import { getSupabase } from '../../supabaseStore.js';
import type { ExchangePairConfig, MarketRate, RateCurrency, UsdPrices } from './types.js';
import { EXCHANGE_PAIR_KEYS } from './config.js';

function throwSb(error: { message?: string } | null, context: string): never {
  throw new Error(`${context}: ${error?.message ?? 'unknown Supabase error'}`);
}

function asRateCurrency(v: unknown): RateCurrency {
  if (v === 'STARS' || v === 'TON' || v === 'USDT_TON') return v;
  throw new Error(`invalid rate currency: ${String(v)}`);
}

function applySpread(mid: number, spreadBps: number): { bid: number; ask: number } {
  const half = spreadBps / 20_000;
  return {
    bid: mid * (1 - half),
    ask: mid * (1 + half),
  };
}

export async function listExchangePairsFromDb(): Promise<ExchangePairConfig[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('exchange_pairs')
    .select(
      'from_currency, to_currency, spread_bps, fee_bps, min_from_amount, max_from_amount, is_active',
    )
    .eq('is_active', true);
  if (error) throwSb(error, 'listExchangePairs');
  return (data ?? []).map((r) => ({
    from: asRateCurrency(r.from_currency),
    to: asRateCurrency(r.to_currency),
    spreadBps: Number(r.spread_bps),
    feeBps: Number(r.fee_bps),
    minFromAmount: Number(r.min_from_amount),
    maxFromAmount: Number(r.max_from_amount),
    isActive: Boolean(r.is_active),
  }));
}

export async function getExchangePairFromDb(
  from: RateCurrency,
  to: RateCurrency,
): Promise<ExchangePairConfig | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('exchange_pairs')
    .select(
      'from_currency, to_currency, spread_bps, fee_bps, min_from_amount, max_from_amount, is_active',
    )
    .eq('from_currency', from)
    .eq('to_currency', to)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throwSb(error, 'getExchangePair');
  if (!data) return null;
  return {
    from: asRateCurrency(data.from_currency),
    to: asRateCurrency(data.to_currency),
    spreadBps: Number(data.spread_bps),
    feeBps: Number(data.fee_bps),
    minFromAmount: Number(data.min_from_amount),
    maxFromAmount: Number(data.max_from_amount),
    isActive: Boolean(data.is_active),
  };
}

export async function persistMarketRatesFromUsd(
  prices: UsdPrices,
  pairSpreadBps: Map<string, number>,
): Promise<MarketRate[]> {
  const sb = getSupabase();
  const now = new Date().toISOString();

  // Preserve admin manual overrides until explicitly cleared.
  const { data: existing, error: existingErr } = await sb
    .from('market_rates')
    .select('base_currency, quote_currency, mid, bid, ask, spread_bps, source, fetched_at')
    .eq('source', 'manual');
  if (existingErr) throwSb(existingErr, 'loadManualRates');
  const manualKeys = new Set(
    (existing ?? []).map((r) => `${r.base_currency}:${r.quote_currency}`),
  );

  const upsertRows: Record<string, unknown>[] = [];
  const rows: MarketRate[] = [];

  for (const [base, quote] of EXCHANGE_PAIR_KEYS) {
    const key = `${base}:${quote}`;
    if (manualKeys.has(key)) {
      const m = (existing ?? []).find(
        (r) => r.base_currency === base && r.quote_currency === quote,
      );
      if (m) {
        rows.push({
          base: asRateCurrency(m.base_currency),
          quote: asRateCurrency(m.quote_currency),
          mid: Number(m.mid),
          bid: Number(m.bid),
          ask: Number(m.ask),
          spreadBps: Number(m.spread_bps),
          source: 'manual',
          fetchedAt: String(m.fetched_at),
        });
      }
      continue;
    }

    const usdBase = prices[base];
    const usdQuote = prices[quote];
    if (!(usdBase > 0) || !(usdQuote > 0)) continue;
    const mid = usdBase / usdQuote;
    const spreadBps = pairSpreadBps.get(key) ?? 100;
    const { bid, ask } = applySpread(mid, spreadBps);
    upsertRows.push({
      base_currency: base,
      quote_currency: quote,
      mid,
      bid,
      ask,
      spread_bps: spreadBps,
      source: prices.source,
      fetched_at: prices.fetchedAt,
      updated_at: now,
    });
    rows.push({
      base,
      quote,
      mid,
      bid,
      ask,
      spreadBps,
      source: prices.source,
      fetchedAt: prices.fetchedAt,
    });
  }

  if (upsertRows.length) {
    const { error } = await sb.from('market_rates').upsert(upsertRows, {
      onConflict: 'base_currency,quote_currency',
    });
    if (error) throwSb(error, 'persistMarketRates');
  }
  return rows;
}

export async function loadMarketRatesFromDb(): Promise<MarketRate[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('market_rates')
    .select('base_currency, quote_currency, mid, bid, ask, spread_bps, source, fetched_at');
  if (error) throwSb(error, 'loadMarketRatesFromDb');
  return (data ?? []).map((r) => ({
    base: asRateCurrency(r.base_currency),
    quote: asRateCurrency(r.quote_currency),
    mid: Number(r.mid),
    bid: Number(r.bid),
    ask: Number(r.ask),
    spreadBps: Number(r.spread_bps),
    source: String(r.source),
    fetchedAt: String(r.fetched_at),
  }));
}
