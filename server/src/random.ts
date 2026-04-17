import type { WeightedPrize, Prize } from './types.js';

/**
 * Weighted random pick — runs on the server so the client
 * cannot predict or manipulate the outcome.
 */
export function pickPrize(prizes: WeightedPrize[]): Prize {
  const total = prizes.reduce((sum, p) => sum + p.weight, 0);
  let r = Math.random() * total;

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
