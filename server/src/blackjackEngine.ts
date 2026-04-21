/**
 * Подсчёт очков и буст без внешних пакетов (стабильно в ESM, без CJS/require).
 * Правила: A = 11/1, J/Q/K/10 = 10, остальные по номиналу; перебор при сумме > 21.
 */
export function codesToRanks(codes: string[]): string[] {
  return codes.map((code) => code.slice(0, -1));
}

export function handTotalAndBustFromRanks(ranks: string[]): { total: number; bust: boolean } {
  let total = 0;
  let aces = 0;
  for (const r of ranks) {
    if (r === 'A') {
      aces += 1;
      total += 11;
    } else if (r === 'J' || r === 'Q' || r === 'K' || r === '10') {
      total += 10;
    } else {
      const n = Number(r);
      if (!Number.isFinite(n)) {
        return { total: 0, bust: true };
      }
      total += n;
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, bust: total > 21 };
}

export function handValueFromCodes(codes: string[]): number {
  return handTotalAndBustFromRanks(codesToRanks(codes)).total;
}

export function isNaturalBlackjack(codes: string[]): boolean {
  if (codes.length !== 2) return false;
  const { total, bust } = handTotalAndBustFromRanks(codesToRanks(codes));
  return total === 21 && !bust;
}
