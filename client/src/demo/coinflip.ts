import type { CoinSide, CoinflipResult } from '../types';
import { getDemoBalanceSnapshot, randInt } from './mode';

const PLAYER_RTP = 0.75;

function payoutForWin(bet: number): number {
  return Math.floor(bet * 2 * PLAYER_RTP);
}

export function demoCoinflipPlay(bet: number, choice: CoinSide): CoinflipResult {
  const result: CoinSide = randInt(2) === 0 ? 'heads' : 'tails';
  const win = result === choice;
  const payout = win ? payoutForWin(bet) : 0;
  return {
    newBalance: getDemoBalanceSnapshot(),
    bet,
    choice,
    result,
    win,
    payout,
  };
}
