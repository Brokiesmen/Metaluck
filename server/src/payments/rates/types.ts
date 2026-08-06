/** Market Rates domain types. */

export type RateCurrency = 'STARS' | 'TON' | 'USDT_TON';

export interface MarketRate {
  base: RateCurrency;
  quote: RateCurrency;
  /** Quote major units per 1 base major unit. */
  mid: number;
  bid: number;
  ask: number;
  spreadBps: number;
  source: string;
  fetchedAt: string;
}

export interface UsdPrices {
  STARS: number;
  TON: number;
  USDT_TON: number;
  source: string;
  fetchedAt: string;
}

export interface ExchangePairConfig {
  from: RateCurrency;
  to: RateCurrency;
  spreadBps: number;
  feeBps: number;
  minFromAmount: number;
  maxFromAmount: number;
  isActive: boolean;
}
