/**
 * Rates cache: Redis (primary) + in-memory L1 fallback when Redis is down/missing.
 */

import { Redis } from 'ioredis';
import type { Redis as RedisClient } from 'ioredis';
import { CACHE_KEYS, ratesCacheTtlSec, redisKeyPrefix, redisUrl } from './config.js';
import type { MarketRate, UsdPrices } from './types.js';

export interface RatesCacheMeta {
  lastRefreshAt: number;
  lastError: string | null;
  source: string | null;
}

type MemoryStore = {
  usd: UsdPrices | null;
  pairs: MarketRate[] | null;
  meta: RatesCacheMeta;
};

const memory: MemoryStore = {
  usd: null,
  pairs: null,
  meta: { lastRefreshAt: 0, lastError: null, source: null },
};

let redis: RedisClient | null | undefined;
let redisConnectWarned = false;

function key(suffix: string): string {
  return `${redisKeyPrefix()}:${suffix}`;
}

export function getRedisClient(): RedisClient | null {
  if (redis !== undefined) return redis;
  const url = redisUrl();
  if (!url) {
    if (!redisConnectWarned) {
      console.warn('[rates] REDIS_URL not set — Market Rates uses in-memory cache only');
      redisConnectWarned = true;
    }
    redis = null;
    return null;
  }
  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      connectTimeout: 5_000,
      retryStrategy(times: number) {
        if (times > 8) return null;
        return Math.min(times * 200, 2_000);
      },
    });
    redis.on('error', (err: Error) => {
      console.warn('[rates] Redis error', err.message);
    });
    return redis;
  } catch (err) {
    console.warn('[rates] Redis init failed', err);
    redis = null;
    return null;
  }
}

async function redisGetJson<T>(suffix: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const raw = await client.get(key(suffix));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function redisSetJson(suffix: string, value: unknown, ttlSec: number): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.set(key(suffix), JSON.stringify(value), 'EX', ttlSec);
  } catch (err) {
    console.warn('[rates] Redis set failed', err instanceof Error ? err.message : err);
  }
}

export async function cacheGetUsdPrices(): Promise<UsdPrices | null> {
  const fromRedis = await redisGetJson<UsdPrices>(CACHE_KEYS.usd);
  if (fromRedis?.TON && fromRedis?.USDT_TON && fromRedis?.STARS) {
    memory.usd = fromRedis;
    return fromRedis;
  }
  return memory.usd;
}

export async function cacheSetUsdPrices(prices: UsdPrices): Promise<void> {
  memory.usd = prices;
  await redisSetJson(CACHE_KEYS.usd, prices, ratesCacheTtlSec());
}

export async function cacheGetPairs(): Promise<MarketRate[] | null> {
  const fromRedis = await redisGetJson<MarketRate[]>(CACHE_KEYS.pairs);
  if (Array.isArray(fromRedis) && fromRedis.length > 0) {
    memory.pairs = fromRedis;
    return fromRedis;
  }
  return memory.pairs;
}

export async function cacheSetPairs(pairs: MarketRate[]): Promise<void> {
  memory.pairs = pairs;
  await redisSetJson(CACHE_KEYS.pairs, pairs, ratesCacheTtlSec());
}

export async function cacheGetMeta(): Promise<RatesCacheMeta> {
  const fromRedis = await redisGetJson<RatesCacheMeta>(CACHE_KEYS.meta);
  if (fromRedis && typeof fromRedis.lastRefreshAt === 'number') {
    memory.meta = fromRedis;
    return fromRedis;
  }
  return memory.meta;
}

export async function cacheSetMeta(meta: RatesCacheMeta): Promise<void> {
  memory.meta = meta;
  await redisSetJson(CACHE_KEYS.meta, meta, ratesCacheTtlSec());
}

export function memorySnapshot() {
  return {
    hasUsd: Boolean(memory.usd),
    hasPairs: Boolean(memory.pairs?.length),
    meta: { ...memory.meta },
    redisConfigured: Boolean(redisUrl()),
  };
}
