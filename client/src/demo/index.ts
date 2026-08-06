export { isDemoMode, setDemoMode, subscribeDemoMode, setDemoBalanceSnapshot, getDemoBalanceSnapshot, delay } from './mode';
export { setDemoPrizePool, demoOpenCase } from './cases';
export { demoCoinflipPlay } from './coinflip';
export {
  resetDemoBlackjack,
  demoBlackjackState,
  demoBlackjackDeal,
  demoBlackjackHit,
  demoBlackjackStand,
  demoBlackjackDouble,
} from './blackjack';
export {
  resetDemoMineRush,
  demoMineRushState,
  demoMineRushStart,
  demoMineRushReveal,
  demoMineRushFlag,
  demoMineRushCashout,
} from './minerush';
export { resetDemoArena, demoArenaState, demoArenaBet } from './arena';

import { resetDemoBlackjack } from './blackjack';
import { resetDemoMineRush } from './minerush';
import { resetDemoArena } from './arena';

/** Clear in-memory demo game sessions when toggling demo on/off. */
export function resetAllDemoSessions(): void {
  resetDemoBlackjack();
  resetDemoMineRush();
  resetDemoArena();
}
