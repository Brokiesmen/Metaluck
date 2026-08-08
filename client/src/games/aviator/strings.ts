/**
 * Every user-visible string in the Aviator module.
 * The games module never imports the app's i18n — the host passes a partial
 * override through GameRuntimeConfig.options.strings and the defaults below
 * fill the rest.
 */
export interface AviatorStrings {
  // Canvas
  multiplier: string;
  waiting: string;
  startingIn: string;
  crashedAt: string;
  youWon: string;
  roundOver: string;
  win: string;
  // Panel
  balance: string;
  placeBet: string;
  amount: string;
  autoCashout: string;
  potential: string;
  live: string;
  bet: string;
  betLocked: string;
  cashOut: string;
  betCurrency: string;
  bettingOpen: string;
  nextRound: string;
  wait: string;
  sound: string;
  // Toasts
  betPlaced: string;
  cashedOutAt: string;
  betLost: string;
}

export const DEFAULT_STRINGS: AviatorStrings = {
  multiplier: 'MULTIPLIER',
  waiting: 'WAITING',
  startingIn: 'STARTING IN',
  crashedAt: 'CRASHED AT',
  youWon: 'YOU WON',
  roundOver: 'ROUND OVER',
  win: 'WIN',

  balance: 'Balance',
  placeBet: 'Place Bet',
  amount: 'Amount',
  autoCashout: 'Auto Cashout',
  potential: 'Potential',
  live: 'Live',
  bet: 'Bet',
  betLocked: 'Bet Locked',
  cashOut: 'Cash Out',
  betCurrency: 'Bet in',
  bettingOpen: 'Betting open',
  nextRound: 'Next round',
  wait: 'WAIT',
  sound: 'Toggle sound',

  betPlaced: 'Bet placed',
  cashedOutAt: 'Cashed out @ {mult}',
  betLost: 'Bet lost',
};

export function resolveStrings(overrides?: Partial<AviatorStrings>): AviatorStrings {
  if (!overrides) return DEFAULT_STRINGS;
  return { ...DEFAULT_STRINGS, ...overrides };
}
