import crypto from 'crypto';
import type { Prize, Rarity } from './types.js';
import { pickOne } from './random.js';

/** Free Wheel of Fortune — once per 7 days. */
export const WHEEL_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
export const WHEEL_CASE_ID = 9007;
export const WHEEL_CASE_NAME = 'Колесо фортуны';

/** Premium Wheel — 1 coupon or 25 Telegram Stars (XTR) per spin. */
export const PREMIUM_WHEEL_CASE_ID = 9008;
export const PREMIUM_WHEEL_CASE_NAME = 'Премиум фортуна';
export const PREMIUM_WHEEL_XTR = 25;
export const PREMIUM_WHEEL_PACKAGE_ID = 'premium_wheel';

/** Coupon ledger rows in histories (prize.coupons delta). */
export const COUPON_LEDGER_CASE_ID = 9010;
export const COUPON_LEDGER_CASE_NAME = 'Купоны';

export const WHEEL_RED = '#e63946';
export const WHEEL_BLACK = '#1a1a1a';
export const WHEEL_GREEN = '#2ecc71';

export type WheelSegment =
  | { id: number; label: string; color: string; weight: number; stars: number }
  | { id: number; label: string; color: string; weight: number; giftRarity: Rarity }
  | { id: number; label: string; color: string; weight: number; empty: true }
  | { id: number; label: string; color: string; weight: number; coupons: number };

/**
 * Free wheel — 8 sectors.
 * 5★ 20% · 15★ 10% · 20★ 5% · 🎟️ coupon 1% · ❌ 64%
 */
export const WHEEL_SEGMENTS: WheelSegment[] = [
  { id: 0, label: '5★', color: WHEEL_RED, weight: 20, stars: 5 },
  { id: 1, label: '❌', color: WHEEL_BLACK, weight: 16, empty: true },
  { id: 2, label: '15★', color: WHEEL_RED, weight: 10, stars: 15 },
  { id: 3, label: '❌', color: WHEEL_BLACK, weight: 16, empty: true },
  { id: 4, label: '20★', color: WHEEL_RED, weight: 5, stars: 20 },
  { id: 5, label: '❌', color: WHEEL_BLACK, weight: 16, empty: true },
  { id: 6, label: '🎟️', color: WHEEL_GREEN, weight: 1, coupons: 1 },
  { id: 7, label: '❌', color: WHEEL_BLACK, weight: 16, empty: true },
];

/**
 * Premium wheel — colours alternate (no same colour neighbours).
 * 25★ 30% red · 50★ 20% black · 100★ 10% black · 250★ 5% black
 * · NFT 2% green · 2 coupons 8% green · ❌ 25% black (fills to 100%)
 *
 * Layout: R B R B G B G B
 */
export const PREMIUM_WHEEL_SEGMENTS: WheelSegment[] = [
  { id: 0, label: '25★', color: WHEEL_RED, weight: 15, stars: 25 },
  { id: 1, label: '50★', color: WHEEL_BLACK, weight: 20, stars: 50 },
  { id: 2, label: '25★', color: WHEEL_RED, weight: 15, stars: 25 },
  { id: 3, label: '100★', color: WHEEL_BLACK, weight: 10, stars: 100 },
  { id: 4, label: '🎟️×2', color: WHEEL_GREEN, weight: 8, coupons: 2 },
  { id: 5, label: '250★', color: WHEEL_BLACK, weight: 5, stars: 250 },
  { id: 6, label: '🎁', color: WHEEL_GREEN, weight: 2, giftRarity: 'gold' },
  { id: 7, label: '❌', color: WHEEL_BLACK, weight: 25, empty: true },
];

function assertWeights(name: string, segs: WheelSegment[]) {
  const total = segs.reduce((s, seg) => s + seg.weight, 0);
  if (total !== 100) throw new Error(`${name} weights must sum to 100, got ${total}`);
}
assertWeights('free', WHEEL_SEGMENTS);
assertWeights('premium', PREMIUM_WHEEL_SEGMENTS);

export function pickSegment(segments: WheelSegment[]): WheelSegment {
  const total = segments.reduce((s, seg) => s + seg.weight, 0);
  let r = crypto.randomInt(0, total);
  for (const seg of segments) {
    if (r < seg.weight) return seg;
    r -= seg.weight;
  }
  return segments[segments.length - 1];
}

export function pickWheelSegment(): WheelSegment {
  return pickSegment(WHEEL_SEGMENTS);
}

export function pickPremiumWheelSegment(): WheelSegment {
  return pickSegment(PREMIUM_WHEEL_SEGMENTS);
}

export type WheelPrizeResult = {
  prize: Prize & { coupons?: number };
  segmentIndex: number;
  empty: boolean;
  couponsDelta: number;
};

export function segmentToPrizeBase(
  segment: WheelSegment,
  giftPool: Prize[],
): WheelPrizeResult {
  if ('empty' in segment && segment.empty) {
    return {
      prize: { id: 9199, name: 'Ничего', rarity: 'gray', icon: '❌', stars: 0 },
      segmentIndex: segment.id,
      empty: true,
      couponsDelta: 0,
    };
  }
  if ('coupons' in segment && typeof segment.coupons === 'number') {
    const n = segment.coupons;
    return {
      prize: {
        id: 9200 + n,
        name: n === 1 ? '1 купон' : `${n} купона`,
        rarity: 'gold',
        icon: '🎟️',
        coupons: n,
      },
      segmentIndex: segment.id,
      empty: false,
      couponsDelta: n,
    };
  }
  if ('giftRarity' in segment && segment.giftRarity) {
    const pool = giftPool.length > 0 ? giftPool : [];
    const prize =
      pool.length > 0
        ? pickOne(pool)
        : ({ id: 1, name: 'NFT-подарок', rarity: 'gold', icon: '🎁' } as Prize);
    return {
      prize,
      segmentIndex: segment.id,
      empty: false,
      couponsDelta: 0,
    };
  }
  const stars = 'stars' in segment ? (segment.stars as number) : 1;
  return {
    prize: {
      id: 9100 + segment.id,
      name: `${stars} ★`,
      rarity: stars >= 100 ? 'gold' : stars >= 50 ? 'purple' : stars >= 20 ? 'blue' : 'gray',
      icon: '⭐',
      stars,
    },
    segmentIndex: segment.id,
    empty: false,
    couponsDelta: 0,
  };
}
