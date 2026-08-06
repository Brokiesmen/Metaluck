import type { Prize } from '../types';
import { getDemoBalanceSnapshot, randInt } from './mode';

const RARITY_WEIGHT: Record<string, number> = {
  gray: 120,
  blue: 45,
  purple: 6,
  gold: 1,
};

let prizePool: Prize[] = [];

export function setDemoPrizePool(prizes: Prize[]): void {
  prizePool = prizes.slice();
}

export function pickDemoPrize(prizes?: Prize[]): Prize {
  const pool = (prizes?.length ? prizes : prizePool).filter(Boolean);
  if (!pool.length) {
    return { id: 0, name: 'Demo Prize', rarity: 'gray', icon: '🎁' };
  }

  const weights = pool.map((p) => {
    if (p.isPremium) return 1;
    if (p.stars) {
      if (p.stars >= 1000) return 2;
      if (p.stars >= 500) return 5;
      if (p.stars >= 100) return 18;
      if (p.stars >= 50) return 40;
      return 80;
    }
    return RARITY_WEIGHT[p.rarity] ?? 20;
  });
  const total = weights.reduce((s, w) => s + w, 0);
  let r = randInt(total);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) {
      let prize = { ...pool[i] };
      const isBig =
        Boolean(prize.isPremium) ||
        prize.rarity === 'gold' ||
        (typeof prize.stars === 'number' && prize.stars >= 500);
      if (isBig && Math.random() < 0.6) {
        const cheap = pool.filter(
          (p) => p.rarity === 'gray' || p.rarity === 'blue' || (p.stars != null && p.stars <= 50),
        );
        if (cheap.length) prize = { ...cheap[randInt(cheap.length)] };
      }
      return prize;
    }
  }
  return { ...pool[pool.length - 1] };
}

export function demoOpenCase(_caseId: number): { prize: Prize; newBalance: number } {
  return {
    prize: pickDemoPrize(),
    newBalance: getDemoBalanceSnapshot(),
  };
}
