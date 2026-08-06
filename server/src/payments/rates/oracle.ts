/**
 * EXTERNAL PRICE ORACLE — private to Market Rates Service.
 *
 * DO NOT import this module from exchange / deposit / wallet / routes / games.
 * All consumers must use payments/rates public API (index.ts).
 */

import { coingeckoBase, starsUsdFallback, starsUsdOracleUrl } from './config.js';
import type { UsdPrices } from './types.js';

async function fetchTonAndUsdtUsd(): Promise<{ ton: number; usdt: number; source: string }> {
  const base = coingeckoBase();
  const url = `${base}/simple/price?ids=the-open-network,tether&vs_currencies=usd`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`CoinGecko error ${res.status}`);
  const body = (await res.json()) as {
    'the-open-network'?: { usd?: number };
    tether?: { usd?: number };
  };
  const ton = Number(body['the-open-network']?.usd);
  const usdt = Number(body.tether?.usd);
  if (!Number.isFinite(ton) || ton <= 0) throw new Error('invalid TON/USD from oracle');
  if (!Number.isFinite(usdt) || usdt <= 0) throw new Error('invalid USDT/USD from oracle');
  return { ton, usdt, source: 'coingecko' };
}

/** Stars/USD: hub manual override → optional HTTP oracle → STARS_USD / hub setting. */
async function fetchStarsUsd(): Promise<{ usd: number; source: string }> {
  try {
    const { getStarsUsdSetting } = await import('../hub/settings.js');
    const hub = await getStarsUsdSetting();
    if (hub.manual && hub.usd > 0) {
      return { usd: hub.usd, source: 'payment_hub_manual' };
    }
  } catch {
    /* settings table may be unavailable during boot */
  }

  const url = starsUsdOracleUrl();
  if (url) {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Stars USD oracle error ${res.status}`);
    const body = (await res.json()) as { usd?: number; price?: number; STARS?: number };
    const usd = Number(body.usd ?? body.price ?? body.STARS);
    if (!Number.isFinite(usd) || usd <= 0) throw new Error('invalid Stars/USD from oracle URL');
    return { usd, source: 'stars_oracle_url' };
  }

  try {
    const { getStarsUsdSetting } = await import('../hub/settings.js');
    const hub = await getStarsUsdSetting();
    if (hub.usd > 0) return { usd: hub.usd, source: 'payment_hub_settings' };
  } catch {
    /* ignore */
  }
  return { usd: starsUsdFallback(), source: 'stars_usd_config' };
}

/** Sole entry point for live market USD prices used by Market Rates Service. */
export async function fetchLiveUsdPrices(): Promise<UsdPrices> {
  const [crypto, stars] = await Promise.all([fetchTonAndUsdtUsd(), fetchStarsUsd()]);
  return {
    STARS: stars.usd,
    TON: crypto.ton,
    USDT_TON: crypto.usdt,
    source: `${crypto.source}+${stars.source}`,
    fetchedAt: new Date().toISOString(),
  };
}
