import type { RateCurrency } from './types.js';

function envNum(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : fallback;
}

/** Fallback Stars/USD when no STARS oracle URL is configured. */
export function starsUsdFallback(): number {
  return envNum('STARS_USD', 0.015);
}

export function ratesRefreshIntervalMs(): number {
  return Math.max(15_000, envInt('RATES_REFRESH_MS', 60_000));
}

/** Redis / memory TTL — slightly longer than refresh interval. */
export function ratesCacheTtlSec(): number {
  return Math.max(60, Math.ceil((ratesRefreshIntervalMs() * 3) / 1000));
}

export function quoteTtlMs(): number {
  return Math.max(5_000, envInt('EXCHANGE_QUOTE_TTL_MS', 30_000));
}

/** @internal Only for rates/oracle.ts */
export function coingeckoBase(): string {
  return String(process.env.COINGECKO_API_BASE ?? 'https://api.coingecko.com/api/v3').replace(
    /\/+$/,
    '',
  );
}

/** Optional JSON endpoint returning `{ "usd": number }` for Stars/USD. */
export function starsUsdOracleUrl(): string {
  return String(process.env.STARS_USD_ORACLE_URL ?? '').trim();
}

export function redisUrl(): string {
  return String(process.env.REDIS_URL ?? '').trim();
}

export function redisKeyPrefix(): string {
  return String(process.env.REDIS_KEY_PREFIX ?? 'metaluck:rates').replace(/:+$/, '');
}

export const RATE_CURRENCIES: RateCurrency[] = ['STARS', 'TON', 'USDT_TON'];

export const EXCHANGE_PAIR_KEYS: Array<[RateCurrency, RateCurrency]> = [
  ['STARS', 'TON'],
  ['TON', 'STARS'],
  ['TON', 'USDT_TON'],
  ['USDT_TON', 'TON'],
  ['STARS', 'USDT_TON'],
  ['USDT_TON', 'STARS'],
];

export const CACHE_KEYS = {
  usd: 'usd',
  pairs: 'pairs',
  meta: 'meta',
} as const;
