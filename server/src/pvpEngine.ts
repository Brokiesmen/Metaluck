import { randomInt } from './random.js';

/** Типы карт */
export type CardType = 'attack' | 'defense' | 'speed';

export const CARD_LABEL: Record<CardType, string> = {
  attack:  'Атака',
  defense: 'Защита',
  speed:   'Скорость',
};

export const CARD_EMOJI: Record<CardType, string> = {
  attack:  '⚔️',
  defense: '🛡️',
  speed:   '⚡',
};

/** Attack > Speed > Defense > Attack */
export function compareCards(a: CardType, b: CardType): 'win' | 'lose' | 'draw' {
  if (a === b) return 'draw';
  const beats: Record<CardType, CardType> = {
    attack:  'speed',
    speed:   'defense',
    defense: 'attack',
  };
  return beats[a] === b ? 'win' : 'lose';
}

export function randomCard(): CardType {
  const c: CardType[] = ['attack', 'defense', 'speed'];
  return c[randomInt(0, 2)];
}

/** XP needed to advance from `level` to `level+1` */
export function xpToNextLevel(level: number): number {
  return level * 100; // 100, 200, 300...
}

export const XP_WIN    = 50;
export const XP_DRAW   = 15;
export const XP_LOSE   =  5;
export const RATING_WIN  =  25;
export const RATING_LOSE = -20;

export const BOT_ID = 0;
export const ROUND_DURATION_MS = 5_000;
export const QUEUE_BOT_TIMEOUT_MS = 6_000;
export const ROUNDS_TOTAL = 3;
export const ROUNDS_TO_WIN = 2;
