/**
 * Game-facing Wallet API.
 *
 * Games MUST NOT call getBalance / addBalance / tryDeductBalance.
 * All stake accounting goes through:
 *   ReserveFunds → CreditBalance (win) | CompleteTransaction (loss) | ReleaseFunds (cancel/push)
 *
 * Stakes are denominated in STARS game units; Wallet locks/pays in `payCurrency`
 * using a mid rate frozen on the reservation (no FX drift between bet and settle).
 */

import crypto from 'crypto';
import { getSupabase } from '../../supabaseStore.js';
import { getMarketRate } from '../rates/index.js';
import { WALLET_CATALOG } from './catalog.js';
import {
  captureLockedWallet,
  creditWallet,
  getWalletBalance,
  lockWallet,
  unlockWallet,
} from './service.js';
import type { WalletCurrency } from './types.js';

export type GameId =
  | 'coinflip'
  | 'blackjack'
  | 'minerush'
  | 'arena'
  | 'aviator'
  | 'cases'
  | 'wheel'
  | 'daily'
  | 'referral'
  | 'other';

/** Opaque reservation handle returned to games (no currency). */
export interface GameReservation {
  reservationId: string;
  /** Stake amount in playable units (same numbers games already use). */
  amount: number;
}

export interface GameWalletResult {
  /** Playable balance after the operation (currency-agnostic for the game). */
  balance: number;
}

interface ReservationRow {
  id: string;
  user_id: number;
  currency_code: string;
  amount: number;
  status: string;
  game: string;
  meta: Record<string, unknown>;
}

function throwSb(error: { message?: string } | null, context: string): never {
  throw new Error(`${context}: ${error?.message ?? 'unknown Supabase error'}`);
}

export type GamePayCurrency = WalletCurrency;

export function isPayCurrency(v: unknown): v is WalletCurrency {
  return v === 'STARS' || v === 'TON' || v === 'USDT_TON';
}

function requireRateMid(rate: Awaited<ReturnType<typeof getMarketRate>>): number {
  if (!rate || !Number.isFinite(rate.mid) || rate.mid <= 0) {
    throw new Error('market_rate_unavailable');
  }
  return rate.mid;
}

function asPlayable(n: number): number {
  return Math.trunc(n);
}

function frozenMidFromMeta(meta: Record<string, unknown>): number | null {
  const mid = Number(meta.frozenMid);
  return Number.isFinite(mid) && mid > 0 ? mid : null;
}

/** Convert STARS game units → wallet minor units using an explicit mid (STARS→currency). */
export function starsToCurrencyAmountWithMid(
  stars: number,
  currency: WalletCurrency,
  mid: number,
): number {
  if (currency === 'STARS') return Math.trunc(stars);
  if (!(mid > 0)) throw new Error('invalid_frozen_mid');
  const scale = 10 ** WALLET_CATALOG[currency].decimals;
  return Math.floor(stars * mid * scale);
}

export function currencyAmountToStarsWithMid(
  amount: number,
  currency: WalletCurrency,
  mid: number,
): number {
  if (currency === 'STARS') return Math.trunc(amount);
  if (!(mid > 0)) throw new Error('invalid_frozen_mid');
  const scale = 10 ** WALLET_CATALOG[currency].decimals;
  return Math.floor(amount / scale / mid);
}

/** Live-market conversion (quotes / balance display). Prefer frozen mid for settlements. */
export async function starsToCurrencyAmount(
  stars: number,
  currency: WalletCurrency,
): Promise<number> {
  if (currency === 'STARS') return Math.trunc(stars);
  const mid = requireRateMid(await getMarketRate('STARS', currency));
  return starsToCurrencyAmountWithMid(stars, currency, mid);
}

export async function currencyAmountToStars(
  amount: number,
  currency: WalletCurrency,
): Promise<number> {
  if (currency === 'STARS') return Math.trunc(amount);
  const mid = requireRateMid(await getMarketRate('STARS', currency));
  return currencyAmountToStarsWithMid(amount, currency, mid);
}

async function resolveMidForCurrency(
  currency: WalletCurrency,
  meta?: Record<string, unknown>,
): Promise<number> {
  if (currency === 'STARS') return 1;
  const frozen = meta ? frozenMidFromMeta(meta) : null;
  if (frozen != null) return frozen;
  return requireRateMid(await getMarketRate('STARS', currency));
}

async function loadReservation(reservationId: string): Promise<ReservationRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('wallet_game_reservations')
    .select('id, user_id, currency_code, amount, status, game, meta')
    .eq('id', reservationId)
    .maybeSingle();
  if (error) throwSb(error, 'loadReservation');
  if (!data) return null;
  return {
    id: String(data.id),
    user_id: Number(data.user_id),
    currency_code: String(data.currency_code),
    amount: Number(data.amount),
    status: String(data.status),
    game: String(data.game),
    meta:
      data.meta && typeof data.meta === 'object'
        ? (data.meta as Record<string, unknown>)
        : {},
  };
}

async function setReservationStatus(
  reservationId: string,
  status: 'captured' | 'released' | 'settled' | 'reserved',
  patch: { amount?: number; meta?: Record<string, unknown>; expectedStatus?: string } = {},
): Promise<boolean> {
  const sb = getSupabase();
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (patch.amount != null) update.amount = patch.amount;
  if (patch.meta) update.meta = patch.meta;
  let q = sb.from('wallet_game_reservations').update(update).eq('id', reservationId);
  if (patch.expectedStatus) q = q.eq('status', patch.expectedStatus);
  const { data, error } = await q.select('id').maybeSingle();
  if (error) throwSb(error, 'setReservationStatus');
  return Boolean(data);
}

/** Playable funds available for stakes, displayed in STARS game units. */
export async function GetPlayableBalance(
  userId: number,
  payCurrency: WalletCurrency = 'STARS',
): Promise<number> {
  const currency = payCurrency;
  const bal = await getWalletBalance(userId, currency);
  return currencyAmountToStars(bal.available, currency);
}

/**
 * Lock stake before a bet. Returns null if insufficient funds.
 */
export async function ReserveFunds(
  userId: number,
  amount: number,
  opts: {
    game: GameId;
    refId?: string;
    meta?: Record<string, unknown>;
    payCurrency?: WalletCurrency;
  },
): Promise<GameReservation | null> {
  const stake = asPlayable(amount);
  if (!Number.isFinite(stake) || stake <= 0) throw new Error('invalid stake');

  const currency = opts.payCurrency ?? 'STARS';
  if (!isPayCurrency(currency)) throw new Error('invalid_pay_currency');
  if (!WALLET_CATALOG[currency].canWager) throw new Error('currency_not_wagerable');

  const frozenMid = await resolveMidForCurrency(currency);
  const lockAmount = starsToCurrencyAmountWithMid(stake, currency, frozenMid);
  if (lockAmount <= 0) throw new Error('stake_below_currency_precision');
  const reservationId = crypto.randomUUID();
  const reservationMeta = {
    ...(opts.meta ?? {}),
    gameAmountStars: stake,
    payCurrency: currency,
    frozenMid,
    frozenAt: new Date().toISOString(),
  };

  const locked = await lockWallet(userId, currency, lockAmount, {
    entryType: 'game_bet',
    idempotencyKey: `game_reserve:${reservationId}`,
    refTable: 'wallet_game_reservations',
    refId: reservationId,
    meta: { game: opts.game, refId: opts.refId ?? null, ...reservationMeta },
  });
  if (!locked) return null;

  const sb = getSupabase();
  const { error } = await sb.from('wallet_game_reservations').insert({
    id: reservationId,
    user_id: userId,
    currency_code: currency,
    amount: lockAmount,
    status: 'reserved',
    game: opts.game,
    ref_id: opts.refId ?? null,
    meta: reservationMeta,
  });
  if (error) {
    await unlockWallet(userId, currency, lockAmount, {
      entryType: 'game_bet',
      idempotencyKey: `game_reserve_rollback:${reservationId}`,
      refTable: 'wallet_game_reservations',
      refId: reservationId,
    }).catch(() => undefined);
    throwSb(error, 'ReserveFunds insert');
  }

  return { reservationId, amount: stake };
}

/** Increase an existing reserved stake (e.g. blackjack double / arena add). */
export async function ReserveAdditional(
  reservationId: string,
  extraAmount: number,
  opts: { payCurrency?: WalletCurrency } = {},
): Promise<GameReservation | null> {
  const extra = asPlayable(extraAmount);
  if (extra <= 0) throw new Error('invalid extra stake');

  const row = await loadReservation(reservationId);
  if (!row || row.status !== 'reserved') return null;

  const currency = row.currency_code as WalletCurrency;
  if (!isPayCurrency(currency) || (opts.payCurrency && opts.payCurrency !== currency)) {
    return null;
  }
  if (!WALLET_CATALOG[currency].canWager) return null;

  const frozenMid = await resolveMidForCurrency(currency, row.meta);
  const lockAmount = starsToCurrencyAmountWithMid(extra, currency, frozenMid);
  if (lockAmount <= 0) throw new Error('stake_below_currency_precision');
  const gameAmountStars = Number.isFinite(Number(row.meta.gameAmountStars))
    ? Math.trunc(Number(row.meta.gameAmountStars))
    : currencyAmountToStarsWithMid(row.amount, currency, frozenMid);

  const locked = await lockWallet(row.user_id, currency, lockAmount, {
    entryType: 'game_bet',
    idempotencyKey: `game_reserve_add:${reservationId}:${row.amount}:${lockAmount}`,
    refTable: 'wallet_game_reservations',
    refId: reservationId,
    meta: { game: row.game, extra: true, gameAmountStars: extra, payCurrency: currency, frozenMid },
  });
  if (!locked) return null;

  const nextAmount = row.amount + lockAmount;
  const nextGameAmountStars = gameAmountStars + extra;
  const nextMeta = {
    ...row.meta,
    gameAmountStars: nextGameAmountStars,
    payCurrency: currency,
    frozenMid,
  };

  // CAS: only bump if amount still matches the snapshot we locked against.
  const sb = getSupabase();
  const { data: cas, error: casErr } = await sb
    .from('wallet_game_reservations')
    .update({
      amount: nextAmount,
      meta: nextMeta,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reservationId)
    .eq('status', 'reserved')
    .eq('amount', row.amount)
    .select('id')
    .maybeSingle();
  if (casErr) {
    await unlockWallet(row.user_id, currency, lockAmount, {
      entryType: 'game_bet',
      idempotencyKey: `game_reserve_add_rollback:${reservationId}:${row.amount}:${lockAmount}`,
      refTable: 'wallet_game_reservations',
      refId: reservationId,
    }).catch(() => undefined);
    throwSb(casErr, 'ReserveAdditional CAS');
  }
  if (!cas) {
    // Concurrent update — unlock the extra we just locked.
    await unlockWallet(row.user_id, currency, lockAmount, {
      entryType: 'game_bet',
      idempotencyKey: `game_reserve_add_cas_fail:${reservationId}:${row.amount}:${lockAmount}`,
      refTable: 'wallet_game_reservations',
      refId: reservationId,
    }).catch(() => undefined);
    return null;
  }

  return { reservationId, amount: nextGameAmountStars };
}

/**
 * Win path: capture reserved stake, then credit payout using the frozen mid.
 */
export async function CreditBalance(
  reservationId: string,
  payout: number,
): Promise<GameWalletResult> {
  const row = await loadReservation(reservationId);
  if (!row) throw new Error('reservation_not_found');
  if (row.status === 'settled') {
    const settledCurrency = isPayCurrency(row.currency_code) ? row.currency_code : 'STARS';
    return { balance: await GetPlayableBalance(row.user_id, settledCurrency) };
  }
  // Retry after capture-but-before-settle: finish credit + mark settled.
  if (row.status === 'captured' && row.meta?.outcome === 'win_capture_pending') {
    const currency = row.currency_code as WalletCurrency;
    const frozenMid = await resolveMidForCurrency(currency, row.meta);
    const payoutStars = Math.max(0, asPlayable(Number(row.meta.payoutStarsPending ?? payout)));
    const pay = starsToCurrencyAmountWithMid(payoutStars, currency, frozenMid);
    if (pay > 0) {
      await creditWallet(row.user_id, currency, pay, {
        entryType: 'game_win',
        idempotencyKey: `game_win:${reservationId}`,
        refTable: 'wallet_game_reservations',
        refId: reservationId,
        meta: { game: row.game, payout: pay, payoutStars, payCurrency: currency, frozenMid },
      });
    }
    await setReservationStatus(reservationId, 'settled', { expectedStatus: 'captured' });
    return { balance: await GetPlayableBalance(row.user_id, currency) };
  }
  if (row.status !== 'reserved') throw new Error('reservation_not_active');

  const currency = row.currency_code as WalletCurrency;
  const metaPayCurrency = isPayCurrency(row.meta.payCurrency) ? row.meta.payCurrency : currency;
  if (!isPayCurrency(currency) || metaPayCurrency !== currency) {
    throw new Error('invalid_reservation_currency');
  }
  const frozenMid = await resolveMidForCurrency(currency, row.meta);
  const gameAmountStars = Number.isFinite(Number(row.meta.gameAmountStars))
    ? Math.trunc(Number(row.meta.gameAmountStars))
    : currencyAmountToStarsWithMid(row.amount, currency, frozenMid);
  const payoutStars = Math.max(0, asPlayable(payout));
  const pay = starsToCurrencyAmountWithMid(payoutStars, currency, frozenMid);

  const captured = await captureLockedWallet(row.user_id, currency, row.amount, {
    entryType: 'game_bet',
    idempotencyKey: `game_capture:${reservationId}`,
    refTable: 'wallet_game_reservations',
    refId: reservationId,
    meta: { game: row.game, outcome: 'win_capture', gameAmountStars, payCurrency: currency, frozenMid },
  });
  if (!captured) throw new Error('capture_failed');

  // Mark captured with pending win so a crashed credit can be retried without unlock.
  await setReservationStatus(reservationId, 'captured', {
    expectedStatus: 'reserved',
    meta: {
      ...row.meta,
      outcome: 'win_capture_pending',
      payoutStarsPending: payoutStars,
      frozenMid,
    },
  });

  if (pay > 0) {
    await creditWallet(row.user_id, currency, pay, {
      entryType: 'game_win',
      idempotencyKey: `game_win:${reservationId}`,
      refTable: 'wallet_game_reservations',
      refId: reservationId,
      meta: { game: row.game, payout: pay, payoutStars, payCurrency: currency, frozenMid },
    });
  }

  await setReservationStatus(reservationId, 'settled', { expectedStatus: 'captured' });
  return { balance: await GetPlayableBalance(row.user_id, currency) };
}

/** Loss path: consume reserved stake permanently. */
export async function CompleteTransaction(reservationId: string): Promise<GameWalletResult> {
  const row = await loadReservation(reservationId);
  if (!row) throw new Error('reservation_not_found');
  if (row.status === 'settled') {
    const settledCurrency = isPayCurrency(row.currency_code) ? row.currency_code : 'STARS';
    return { balance: await GetPlayableBalance(row.user_id, settledCurrency) };
  }
  // Win path interrupted after capture — finish credit rather than treating as loss.
  if (row.status === 'captured' && row.meta?.outcome === 'win_capture_pending') {
    return CreditBalance(reservationId, Number(row.meta.payoutStarsPending ?? 0));
  }
  if (row.status === 'captured') {
    const settledCurrency = isPayCurrency(row.currency_code) ? row.currency_code : 'STARS';
    return { balance: await GetPlayableBalance(row.user_id, settledCurrency) };
  }
  if (row.status !== 'reserved') throw new Error('reservation_not_active');

  const currency = row.currency_code as WalletCurrency;
  if (!isPayCurrency(currency)) throw new Error('invalid_reservation_currency');
  const captured = await captureLockedWallet(row.user_id, currency, row.amount, {
    entryType: 'game_bet',
    idempotencyKey: `game_lose:${reservationId}`,
    refTable: 'wallet_game_reservations',
    refId: reservationId,
    meta: { game: row.game, outcome: 'lose' },
  });
  if (!captured) throw new Error('capture_failed');

  await setReservationStatus(reservationId, 'captured', { expectedStatus: 'reserved' });
  return { balance: await GetPlayableBalance(row.user_id, currency) };
}

/** Cancel / push: return reserved stake to available. */
export async function ReleaseFunds(reservationId: string): Promise<GameWalletResult> {
  const row = await loadReservation(reservationId);
  if (!row) throw new Error('reservation_not_found');
  if (row.status === 'released') {
    const releasedCurrency = isPayCurrency(row.currency_code) ? row.currency_code : 'STARS';
    return { balance: await GetPlayableBalance(row.user_id, releasedCurrency) };
  }
  if (row.status !== 'reserved') throw new Error('reservation_not_active');

  const currency = row.currency_code as WalletCurrency;
  if (!isPayCurrency(currency)) throw new Error('invalid_reservation_currency');
  const unlocked = await unlockWallet(row.user_id, currency, row.amount, {
    entryType: 'game_bet',
    idempotencyKey: `game_release:${reservationId}`,
    refTable: 'wallet_game_reservations',
    refId: reservationId,
    meta: { game: row.game, outcome: 'release' },
  });
  if (!unlocked) throw new Error('unlock_failed');

  await setReservationStatus(reservationId, 'released', { expectedStatus: 'reserved' });
  return { balance: await GetPlayableBalance(row.user_id, currency) };
}

/**
 * Credit without a prior reservation (prizes, referrals, free rewards).
 * Still goes through Wallet — never direct balance writes.
 */
export async function CreditWinnings(
  userId: number,
  amount: number,
  opts: { game: GameId; refId?: string; idempotencyKey?: string },
): Promise<GameWalletResult> {
  const pay = asPlayable(amount);
  if (pay <= 0) return { balance: await GetPlayableBalance(userId) };

  const currency: WalletCurrency = 'STARS';
  await creditWallet(userId, currency, pay, {
    entryType: 'game_win',
    idempotencyKey:
      opts.idempotencyKey ?? `game_credit:${opts.game}:${opts.refId ?? crypto.randomUUID()}`,
    refTable: opts.game,
    refId: opts.refId ?? null,
    meta: { game: opts.game },
  });
  return { balance: await GetPlayableBalance(userId) };
}
