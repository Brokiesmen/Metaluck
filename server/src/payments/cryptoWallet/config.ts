import crypto from 'crypto';
import {
  tonApiBase as chainTonApiBase,
  tonApiKey as chainTonApiKey,
  tonRpcEndpoint as chainTonRpcEndpoint,
  tonCenterApiKey as chainTonCenterApiKey,
  usdtJettonMaster as chainUsdtJettonMaster,
  withdrawHotMnemonic as chainWithdrawHotMnemonic,
  jettonTransferGasNanotons as chainJettonGas,
} from '../blockchain/config.js';

export type CryptoNetwork = 'ton';
export type CryptoCurrency = 'TON' | 'USDT_TON';

/** @deprecated use BlockchainService — re-exported for legacy imports */
export const tonApiBase = chainTonApiBase;
export const tonApiKey = chainTonApiKey;
export const tonRpcEndpoint = chainTonRpcEndpoint;
export const tonCenterApiKey = chainTonCenterApiKey;
export const usdtJettonMaster = chainUsdtJettonMaster;
export const withdrawHotMnemonic = chainWithdrawHotMnemonic;
export const jettonTransferGasNanotons = chainJettonGas;

export function confirmationsRequired(): number {
  const n = Number(process.env.TON_DEPOSIT_CONFIRMATIONS ?? 1);
  return Number.isFinite(n) && n >= 1 ? Math.trunc(n) : 1;
}

export function minTonNanotons(): number {
  const n = Number(process.env.DEPOSIT_MIN_TON_NANOTONS ?? 100_000_000);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 100_000_000;
}

export function minUsdtMicros(): number {
  const n = Number(process.env.DEPOSIT_MIN_USDT_MICROS ?? 1_000_000);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 1_000_000;
}

export function listenerIntervalMs(): number {
  const n = Number(process.env.CRYPTO_LISTENER_INTERVAL_MS ?? 20_000);
  return Number.isFinite(n) && n >= 5_000 ? Math.trunc(n) : 20_000;
}

export function listenerBatchSize(): number {
  const n = Number(process.env.CRYPTO_LISTENER_BATCH_SIZE ?? 25);
  return Number.isFinite(n) && n >= 1 ? Math.min(100, Math.trunc(n)) : 25;
}

export function listenerActiveWindowMs(): number {
  const n = Number(process.env.CRYPTO_LISTENER_ACTIVE_MS ?? 7 * 24 * 60 * 60 * 1000);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 7 * 24 * 60 * 60 * 1000;
}

/**
 * Master seed for HD-like per-user deposit addresses.
 * Prefer TON_DEPOSIT_MASTER_SEED; fallback to SESSION_SECRET / TELEGRAM_BOT_TOKEN hash (dev only).
 */
export function depositMasterSeed(): Buffer | null {
  const raw = String(process.env.TON_DEPOSIT_MASTER_SEED ?? '').trim();
  if (raw) {
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
    return crypto.createHash('sha256').update(raw).digest();
  }
  if (process.env.NODE_ENV === 'production') return null;
  const fallback = String(process.env.SESSION_SECRET ?? process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
  if (!fallback) return null;
  return crypto.createHash('sha256').update(`ton-deposit-dev:${fallback}`).digest();
}

export function isCryptoWalletEnabled(): boolean {
  return depositMasterSeed() != null;
}

export function isCryptoWithdrawEnabled(): boolean {
  return isCryptoWalletEnabled() && withdrawHotMnemonic() != null;
}

/** Env-only fallbacks (cold start / hub unavailable). */
function envConfirmations(): number {
  const n = Number(process.env.TON_DEPOSIT_CONFIRMATIONS ?? 1);
  return Number.isFinite(n) && n >= 1 ? Math.trunc(n) : 1;
}

function envWithdrawFeeTon(): number {
  const n = Number(process.env.WITHDRAW_FEE_TON_NANOTONS ?? 50_000_000);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 50_000_000;
}
function envWithdrawFeeUsdt(): number {
  const n = Number(process.env.WITHDRAW_FEE_USDT_MICROS ?? 100_000);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 100_000;
}
function envWithdrawMinTon(): number {
  const n = Number(process.env.WITHDRAW_MIN_TON_NANOTONS ?? 100_000_000);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 100_000_000;
}
function envWithdrawMinUsdt(): number {
  const n = Number(process.env.WITHDRAW_MIN_USDT_MICROS ?? 1_000_000);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 1_000_000;
}
function envWithdrawMaxTon(): number {
  const n = Number(process.env.WITHDRAW_MAX_TON_NANOTONS ?? 1_000_000_000_000);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 1_000_000_000_000;
}
function envWithdrawMaxUsdt(): number {
  const n = Number(process.env.WITHDRAW_MAX_USDT_MICROS ?? 10_000_000_000);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 10_000_000_000;
}
function envWithdrawDailyTon(): number {
  const n = Number(process.env.WITHDRAW_DAILY_LIMIT_TON_NANOTONS ?? 5_000_000_000_000);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 5_000_000_000_000;
}
function envWithdrawDailyUsdt(): number {
  const n = Number(process.env.WITHDRAW_DAILY_LIMIT_USDT_MICROS ?? 50_000_000_000);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 50_000_000_000;
}

/** Prefer Payment Hub settings; fall back to env. */
export async function resolveConfirmationsRequired(): Promise<number> {
  try {
    const hub = await import('../hub/settings.js');
    return await hub.getCryptoDepositConfirmations();
  } catch {
    return envConfirmations();
  }
}

export async function resolveMinTonNanotons(): Promise<number> {
  try {
    const hub = await import('../hub/settings.js');
    return await hub.getCryptoDepositMinTonNanotons();
  } catch {
    return minTonNanotons();
  }
}

export async function resolveMinUsdtMicros(): Promise<number> {
  try {
    const hub = await import('../hub/settings.js');
    return await hub.getCryptoDepositMinUsdtMicros();
  } catch {
    return minUsdtMicros();
  }
}

export async function resolveWithdrawFee(currency: CryptoCurrency): Promise<number> {
  try {
    const hub = await import('../hub/settings.js');
    return currency === 'TON'
      ? await hub.getCryptoWithdrawFeeTonNanotons()
      : await hub.getCryptoWithdrawFeeUsdtMicros();
  } catch {
    return currency === 'TON' ? envWithdrawFeeTon() : envWithdrawFeeUsdt();
  }
}

export async function resolveWithdrawMin(currency: CryptoCurrency): Promise<number> {
  try {
    const hub = await import('../hub/settings.js');
    return currency === 'TON'
      ? await hub.getCryptoWithdrawMinTonNanotons()
      : await hub.getCryptoWithdrawMinUsdtMicros();
  } catch {
    return currency === 'TON' ? envWithdrawMinTon() : envWithdrawMinUsdt();
  }
}

export async function resolveWithdrawMax(currency: CryptoCurrency): Promise<number> {
  try {
    const hub = await import('../hub/settings.js');
    return currency === 'TON'
      ? await hub.getCryptoWithdrawMaxTonNanotons()
      : await hub.getCryptoWithdrawMaxUsdtMicros();
  } catch {
    return currency === 'TON' ? envWithdrawMaxTon() : envWithdrawMaxUsdt();
  }
}

export async function resolveWithdrawDailyLimit(currency: CryptoCurrency): Promise<number> {
  try {
    const hub = await import('../hub/settings.js');
    return currency === 'TON'
      ? await hub.getCryptoWithdrawDailyTonNanotons()
      : await hub.getCryptoWithdrawDailyUsdtMicros();
  } catch {
    return currency === 'TON' ? envWithdrawDailyTon() : envWithdrawDailyUsdt();
  }
}

/** Sync aliases (env) — prefer resolve* in async paths. */
export function withdrawFeeTonNanotons(): number {
  return envWithdrawFeeTon();
}
export function withdrawFeeUsdtMicros(): number {
  return envWithdrawFeeUsdt();
}
export function withdrawMinTonNanotons(): number {
  return envWithdrawMinTon();
}
export function withdrawMinUsdtMicros(): number {
  return envWithdrawMinUsdt();
}
export function withdrawMaxTonNanotons(): number {
  return envWithdrawMaxTon();
}
export function withdrawMaxUsdtMicros(): number {
  return envWithdrawMaxUsdt();
}
export function withdrawDailyLimitTonNanotons(): number {
  return envWithdrawDailyTon();
}
export function withdrawDailyLimitUsdtMicros(): number {
  return envWithdrawDailyUsdt();
}

export function withdrawFee(currency: CryptoCurrency): number {
  return currency === 'TON' ? envWithdrawFeeTon() : envWithdrawFeeUsdt();
}
export function withdrawMin(currency: CryptoCurrency): number {
  return currency === 'TON' ? envWithdrawMinTon() : envWithdrawMinUsdt();
}
export function withdrawMax(currency: CryptoCurrency): number {
  return currency === 'TON' ? envWithdrawMaxTon() : envWithdrawMaxUsdt();
}
export function withdrawDailyLimit(currency: CryptoCurrency): number {
  return currency === 'TON' ? envWithdrawDailyTon() : envWithdrawDailyUsdt();
}
