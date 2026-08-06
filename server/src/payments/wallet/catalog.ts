import type { CurrencyInfo, WalletCurrency } from './types.js';

/** Static catalog mirrored in `currencies` table (v1). */
export const WALLET_CATALOG: Record<WalletCurrency, CurrencyInfo> = {
  STARS: {
    code: 'STARS',
    kind: 'internal',
    decimals: 0,
    network: null,
    displaySymbol: '★',
    canDeposit: true,
    canWithdraw: true,
    canExchange: true,
    canWager: true,
  },
  TON: {
    code: 'TON',
    kind: 'crypto',
    decimals: 9,
    network: 'ton',
    displaySymbol: 'TON',
    canDeposit: true,
    canWithdraw: true,
    canExchange: true,
    canWager: true,
  },
  USDT_TON: {
    code: 'USDT_TON',
    kind: 'crypto',
    decimals: 6,
    network: 'ton',
    displaySymbol: 'USDT',
    canDeposit: true,
    canWithdraw: true,
    canExchange: true,
    canWager: true,
  },
};

export function catalogList(): CurrencyInfo[] {
  return Object.values(WALLET_CATALOG);
}
