import crypto from 'crypto';
import { HOUSE_EDGE } from './houseEdge.js';

/**
 * Aviator (crash) — чистая математика без Fastify и БД.
 *
 * Экономика:
 *  Точка краша генерируется так, что P(crash ≥ m) = (1 − HOUSE_EDGE) / m для m > 1.
 *  Тогда матожидание выплаты при кэшауте на любом множителе m равно
 *    E = P(crash ≥ m) · m = (1 − HOUSE_EDGE),
 *  то есть RTP = 1 − HOUSE_EDGE = 0.75 при ЛЮБОЙ стратегии игрока.
 *  Поэтому house edge «зашит» в распределение краша, и выплата за кэшаут —
 *  честные bet × mult (повторно applyHouseEdge применять НЕЛЬЗЯ — это удвоило бы
 *  комиссию). Единственный источник величины комиссии — HOUSE_EDGE из houseEdge.ts.
 */

export const ALLOWED_BETS = [1, 5, 10, 25, 50, 100] as const;
export type AllowedBet = (typeof ALLOWED_BETS)[number];

/** Максимум суммарной ставки одного игрока за раунд. */
export const MAX_TOTAL_BET_PER_PLAYER = 500;

/** Минимально осмысленный авто-кэшаут / кэшаут. */
export const MIN_CASHOUT = 1.01;

/** Верхняя граница множителя — ограничивает длину полёта. */
export const MAX_CRASH = 100;

/**
 * Скорость роста множителя: m(t) = e^(GROWTH_K · t[сек]).
 * Время достижения множителя C: t = ln(C) / GROWTH_K.
 * При GROWTH_K = 0.12: 2× ≈ 5.8 c, 10× ≈ 19 c, 100× ≈ 38 c.
 */
export const GROWTH_K = 0.12;

export function isAllowedBet(bet: number): bet is AllowedBet {
  return (ALLOWED_BETS as readonly number[]).includes(bet);
}

/** Криптостойкое равномерное число в [0, 1). */
function randFloat(): number {
  return crypto.randomInt(0, 0x100000000) / 0x100000000;
}

/** Округление вниз до двух знаков (множители показываем как X.XX). */
function floor2(x: number): number {
  return Math.floor(x * 100) / 100;
}

/** Текущий множитель по времени полёта (мс от старта). Монотонно растёт от 1.00. */
export function multiplierAt(elapsedMs: number): number {
  const t = Math.max(0, elapsedMs) / 1000;
  return Math.max(1, floor2(Math.exp(GROWTH_K * t)));
}

/** Обратная функция: сколько мс лететь до множителя `mult` (для планирования краша). */
export function timeToReachMs(mult: number): number {
  if (mult <= 1) return 0;
  return Math.ceil((Math.log(mult) / GROWTH_K) * 1000);
}

/**
 * Точка краша. С вероятностью HOUSE_EDGE — мгновенный краш на 1.00
 * (это и есть комиссия дома). Иначе crash = 1/(1−r), что даёт
 * P(crash ≥ m) = (1 − HOUSE_EDGE)/m. Ограничено сверху MAX_CRASH.
 */
export function generateCrashPoint(): number {
  if (randFloat() < HOUSE_EDGE) return 1.0;
  const r = randFloat(); // [0, 1)
  const raw = 1 / (1 - r); // 1 … ∞, P(≥x) = 1/x
  return Math.min(MAX_CRASH, Math.max(MIN_CASHOUT, floor2(raw)));
}

/** Выплата за кэшаут: честные bet × mult (комиссия уже в распределении краша). */
export function payoutForCashout(bet: number, mult: number): number {
  return Math.floor(bet * mult);
}

/** Валидный ли авто-кэшаут: число ≥ MIN_CASHOUT или null (выкл). */
export function normalizeAutoCashout(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < MIN_CASHOUT) return null;
  return floor2(n);
}
