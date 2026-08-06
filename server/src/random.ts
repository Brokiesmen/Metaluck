import crypto from 'crypto';
import type { WeightedPrize, Prize } from './types.js';

/** Uniform float in [0, 1). */
export function randomUnit(): number {
  // 53 bits of randomness — enough for prize weights / house-edge rolls
  const buf = crypto.randomBytes(7);
  let n = 0;
  for (let i = 0; i < 7; i++) n = n * 256 + buf[i];
  return n / 2 ** 56;
}

/** Inclusive integer in [min, max]. */
export function randomInt(min: number, max: number): number {
  return crypto.randomInt(min, max + 1);
}

/** Pick a uniform element from a non-empty array. */
export function pickOne<T>(items: T[]): T {
  if (items.length === 0) throw new Error('pickOne: empty array');
  return items[crypto.randomInt(0, items.length)];
}

/**
 * Weighted random pick — runs on the server so the client
 * cannot predict or manipulate the outcome.
 */
export function pickPrize(prizes: WeightedPrize[]): Prize {
  const total = prizes.reduce((sum, p) => sum + p.weight, 0);
  let r = randomUnit() * total;

  for (const p of prizes) {
    r -= p.weight;
    if (r <= 0) {
      const { weight: _w, ...prize } = p;
      return prize;
    }
  }

  const { weight: _w, ...last } = prizes[prizes.length - 1];
  return last;
}
