/**
 * Market Rates Service — single source of truth for FX prices.
 *
 * - Fetches TON/USD, USDT/USD, Stars/USD via private oracle (only this service).
 * - Caches in Redis (+ memory fallback) and persists cross-pairs to Postgres.
 * - Other modules MUST use this public API only — never call CoinGecko / oracles directly.
 */

import {
  cacheGetMeta,
  cacheGetPairs,
  cacheGetUsdPrices,
  cacheSetMeta,
  cacheSetPairs,
  cacheSetUsdPrices,
  memorySnapshot,
} from './cache.js';
import { ratesRefreshIntervalMs } from './config.js';
import { fetchLiveUsdPrices } from './oracle.js';
import {
  getExchangePairFromDb,
  listExchangePairsFromDb,
  loadMarketRatesFromDb,
  persistMarketRatesFromUsd,
} from './store.js';
import type { ExchangePairConfig, MarketRate, RateCurrency, UsdPrices } from './types.js';

let refreshInFlight: Promise<{ usd: UsdPrices; pairs: MarketRate[] }> | null = null;

export function getRatesRefreshStatus() {
  const snap = memorySnapshot();
  return {
    lastRefreshAt: snap.meta.lastRefreshAt,
    lastRefreshError: snap.meta.lastError,
    source: snap.meta.source,
    redisConfigured: snap.redisConfigured,
  };
}

/**
 * Pull live prices from oracle → Redis → Postgres.
 * Prefer calling via the auto-refresher or admin; consumers should use getters.
 */
export async function refreshMarketRates(force = false): Promise<MarketRate[]> {
  const result = await refreshAll(force);
  return result.pairs;
}

async function refreshAll(force = false): Promise<{ usd: UsdPrices; pairs: MarketRate[] }> {
  if (!force && refreshInFlight) return refreshInFlight;

  const meta = await cacheGetMeta();
  const age = Date.now() - (meta.lastRefreshAt || 0);
  if (!force && meta.lastRefreshAt > 0 && age < Math.min(15_000, ratesRefreshIntervalMs() / 2)) {
    const usd = await cacheGetUsdPrices();
    const pairs = await cacheGetPairs();
    if (usd && pairs?.length) return { usd, pairs };
  }

  refreshInFlight = (async () => {
    try {
      const pairsCfg = await listExchangePairsFromDb();
      const spreadMap = new Map(pairsCfg.map((p) => [`${p.from}:${p.to}`, p.spreadBps]));
      const usd = await fetchLiveUsdPrices();
      const pairs = await persistMarketRatesFromUsd(usd, spreadMap);
      await cacheSetUsdPrices(usd);
      await cacheSetPairs(pairs);
      await cacheSetMeta({
        lastRefreshAt: Date.now(),
        lastError: null,
        source: usd.source,
      });
      return { usd, pairs };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const prev = await cacheGetMeta();
      await cacheSetMeta({
        lastRefreshAt: prev.lastRefreshAt,
        lastError: message,
        source: prev.source,
      });

      const cachedUsd = await cacheGetUsdPrices();
      let cachedPairs = await cacheGetPairs();
      if (!cachedPairs?.length) {
        cachedPairs = await loadMarketRatesFromDb();
        if (cachedPairs.length) await cacheSetPairs(cachedPairs);
      }
      if (cachedUsd && cachedPairs.length) {
        return { usd: cachedUsd, pairs: cachedPairs };
      }
      throw err;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/** Ensure cache is warm; may trigger a background/foreground refresh once. */
async function ensureCached(): Promise<void> {
  const usd = await cacheGetUsdPrices();
  const pairs = await cacheGetPairs();
  if (usd && pairs && pairs.length > 0) return;
  await refreshAll(true);
}

/** TON/USD, USDT/USD, Stars/USD — only via Market Rates Service. */
export async function getUsdPrices(): Promise<UsdPrices> {
  await ensureCached();
  const usd = await cacheGetUsdPrices();
  if (!usd) {
    const refreshed = await refreshAll(true);
    return refreshed.usd;
  }
  return usd;
}

export async function getUsdPrice(currency: RateCurrency): Promise<number> {
  const prices = await getUsdPrices();
  const v = prices[currency];
  if (!(v > 0)) throw new Error(`USD price unavailable for ${currency}`);
  return v;
}

export async function listMarketRates(): Promise<MarketRate[]> {
  await ensureCached();
  const cached = await cacheGetPairs();
  if (cached?.length) return cached;
  const fromDb = await loadMarketRatesFromDb();
  if (fromDb.length) {
    await cacheSetPairs(fromDb);
    return fromDb;
  }
  const refreshed = await refreshAll(true);
  return refreshed.pairs;
}

export async function getMarketRate(
  base: RateCurrency,
  quote: RateCurrency,
): Promise<MarketRate | null> {
  const rates = await listMarketRates();
  return rates.find((r) => r.base === base && r.quote === quote) ?? null;
}

export async function listExchangePairs(): Promise<ExchangePairConfig[]> {
  return listExchangePairsFromDb();
}

export async function getExchangePair(
  from: RateCurrency,
  to: RateCurrency,
): Promise<ExchangePairConfig | null> {
  return getExchangePairFromDb(from, to);
}

/** Snapshot for HTTP / diagnostics (reads cache only; warms if empty). */
export async function getRatesSnapshot() {
  const [usd, rates, meta] = await Promise.all([
    getUsdPrices(),
    listMarketRates(),
    cacheGetMeta(),
  ]);
  return {
    usd: {
      'TON/USD': usd.TON,
      'USDT/USD': usd.USDT_TON,
      'STARS/USD': usd.STARS,
      source: usd.source,
      fetchedAt: usd.fetchedAt,
    },
    rates,
    refreshedAt: meta.lastRefreshAt ? new Date(meta.lastRefreshAt).toISOString() : null,
    lastError: meta.lastError,
    redisConfigured: memorySnapshot().redisConfigured,
  };
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startRatesAutoRefresh(intervalMs = ratesRefreshIntervalMs()): void {
  if (intervalHandle) return;
  void refreshAll(true).catch((err) => {
    console.warn('[rates] initial refresh failed', err);
  });
  intervalHandle = setInterval(() => {
    void refreshAll(true).catch((err) => {
      console.warn('[rates] refresh failed', err);
    });
  }, intervalMs);
  if (typeof intervalHandle === 'object' && 'unref' in intervalHandle) {
    intervalHandle.unref?.();
  }
  console.log(`[rates] auto-refresh every ${intervalMs}ms (Redis=${Boolean(memorySnapshot().redisConfigured)})`);
}

export function stopRatesAutoRefresh(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
