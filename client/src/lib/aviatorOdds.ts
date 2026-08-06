/**
 * Зеркало серверной кривой множителя (server/src/aviatorEngine.ts).
 *
 * Клиент НЕ решает исход — он только рисует множитель между сетевыми
 * обновлениями: сервер присылает startedAt и точку краша (после краша),
 * а промежуточные кадры интерполируются этой же формулой от серверного времени.
 * Значения должны совпадать с сервером, иначе счётчик «прыгнет» при синхронизации.
 */

/** m(t) = e^(GROWTH_K · t[сек]) — держать в синхроне с сервером. */
export const GROWTH_K = 0.12;

export const MIN_CASHOUT = 1.01;

function floor2(x: number): number {
  return Math.floor(x * 100) / 100;
}

/** Текущий множитель по времени полёта (мс). */
export function multiplierAt(elapsedMs: number): number {
  const t = Math.max(0, elapsedMs) / 1000;
  return Math.max(1, floor2(Math.exp(GROWTH_K * t)));
}

/** Сколько мс лететь до множителя (для геометрии графика). */
export function timeToReachMs(mult: number): number {
  if (mult <= 1) return 0;
  return Math.ceil((Math.log(mult) / GROWTH_K) * 1000);
}

/** «2.00×» — единый формат по всему экрану. */
export function formatMult(mult: number): string {
  return `${mult.toFixed(2)}×`;
}

/** Потенциальная выплата за кэшаут (комиссия уже в распределении краша). */
export function payoutForCashout(bet: number, mult: number): number {
  return Math.floor(bet * mult);
}

/** Цвет чипа в истории: чем выше множитель, тем «горячее». */
export function historyTone(mult: number): 'low' | 'mid' | 'high' {
  if (mult < 2) return 'low';
  if (mult < 10) return 'mid';
  return 'high';
}
