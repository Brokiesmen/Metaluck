/**
 * Payment Hub runtime settings — editable without redeploy.
 * Values live in payment_hub_settings; env is only a cold fallback / bootstrap.
 */

import { getSupabase } from '../../supabaseStore.js';

export type HubSettingKey =
  | 'withdraw_min_stars'
  | 'withdraw_presets'
  | 'deposit_min_stars'
  | 'deposit_min_ton_nanotons'
  | 'deposit_min_usdt_micros'
  | 'stars_usd'
  | 'stars_usd_manual'
  | 'exchange_quote_ttl_ms'
  | 'rates_refresh_ms';

const DEFAULTS: Record<HubSettingKey, unknown> = {
  withdraw_min_stars: 100,
  withdraw_presets: [100, 250, 500, 1000, 5000],
  deposit_min_stars: 25,
  deposit_min_ton_nanotons: 100_000_000,
  deposit_min_usdt_micros: 1_000_000,
  stars_usd: Number(process.env.STARS_USD) > 0 ? Number(process.env.STARS_USD) : 0.015,
  stars_usd_manual: false,
  exchange_quote_ttl_ms: Number(process.env.EXCHANGE_QUOTE_TTL_MS) > 0
    ? Number(process.env.EXCHANGE_QUOTE_TTL_MS)
    : 30_000,
  rates_refresh_ms: Number(process.env.RATES_REFRESH_MS) > 0
    ? Number(process.env.RATES_REFRESH_MS)
    : 60_000,
};

let cache: Map<string, unknown> | null = null;
let cacheAt = 0;
const CACHE_TTL_MS = 5_000;

function throwSb(error: { message?: string } | null, context: string): never {
  throw new Error(`${context}: ${error?.message ?? 'unknown Supabase error'}`);
}

export async function invalidateHubSettingsCache(): Promise<void> {
  cache = null;
  cacheAt = 0;
}

async function loadAll(): Promise<Map<string, unknown>> {
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) return cache;
  const sb = getSupabase();
  const { data, error } = await sb.from('payment_hub_settings').select('key, value');
  if (error) throwSb(error, 'loadHubSettings');
  const map = new Map<string, unknown>();
  for (const [k, v] of Object.entries(DEFAULTS)) map.set(k, v);
  for (const row of data ?? []) {
    map.set(String(row.key), row.value);
  }
  cache = map;
  cacheAt = Date.now();
  return map;
}

export async function getHubSetting<T = unknown>(key: HubSettingKey): Promise<T> {
  const all = await loadAll();
  return (all.has(key) ? all.get(key) : DEFAULTS[key]) as T;
}

export async function listHubSettings(): Promise<Record<string, unknown>> {
  const all = await loadAll();
  return Object.fromEntries(all.entries());
}

export async function setHubSetting(
  key: HubSettingKey,
  value: unknown,
  updatedBy: number | null,
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('payment_hub_settings').upsert(
    {
      key,
      value,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    },
    { onConflict: 'key' },
  );
  if (error) throwSb(error, 'setHubSetting');
  await invalidateHubSettingsCache();
}

export async function setHubSettingsBulk(
  patch: Partial<Record<HubSettingKey, unknown>>,
  updatedBy: number | null,
): Promise<Record<string, unknown>> {
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in DEFAULTS)) continue;
    await setHubSetting(key as HubSettingKey, value, updatedBy);
  }
  return listHubSettings();
}

export async function getWithdrawMinStars(): Promise<number> {
  const n = Number(await getHubSetting('withdraw_min_stars'));
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 100;
}

export async function getWithdrawPresets(): Promise<number[]> {
  const raw = await getHubSetting<unknown>('withdraw_presets');
  if (!Array.isArray(raw)) return [100, 250, 500, 1000, 5000];
  return raw.map((x) => Math.trunc(Number(x))).filter((n) => n > 0);
}

export async function getDepositMinStars(): Promise<number> {
  const n = Number(await getHubSetting('deposit_min_stars'));
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 25;
}

export async function getDepositMinTonNanotons(): Promise<number> {
  const n = Number(await getHubSetting('deposit_min_ton_nanotons'));
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 100_000_000;
}

export async function getDepositMinUsdtMicros(): Promise<number> {
  const n = Number(await getHubSetting('deposit_min_usdt_micros'));
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 1_000_000;
}

export async function getStarsUsdSetting(): Promise<{ usd: number; manual: boolean }> {
  const usd = Number(await getHubSetting('stars_usd'));
  const rawManual = await getHubSetting<unknown>('stars_usd_manual');
  const manual = rawManual === true || rawManual === 'true' || rawManual === 1;
  return {
    usd: Number.isFinite(usd) && usd > 0 ? usd : 0.015,
    manual,
  };
}

export async function getExchangeQuoteTtlMs(): Promise<number> {
  const n = Number(await getHubSetting('exchange_quote_ttl_ms'));
  return Math.max(5_000, Number.isFinite(n) ? Math.trunc(n) : 30_000);
}

export async function getRatesRefreshMs(): Promise<number> {
  const n = Number(await getHubSetting('rates_refresh_ms'));
  return Math.max(15_000, Number.isFinite(n) ? Math.trunc(n) : 60_000);
}

export const HUB_SETTING_KEYS = Object.keys(DEFAULTS) as HubSettingKey[];
