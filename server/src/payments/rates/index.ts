/**
 * Public Market Rates Service API.
 *
 * Forbidden for other modules:
 * - importing `./oracle.js` or calling CoinGecko / STARS oracle URLs directly
 * - reading Redis keys outside this package
 *
 * Allowed:
 * - getUsdPrices / getUsdPrice / getMarketRate / listMarketRates
 * - getExchangePair / listExchangePairs
 * - getRatesSnapshot / refreshMarketRates (admin) / startRatesAutoRefresh
 */

export type { ExchangePairConfig, MarketRate, RateCurrency, UsdPrices } from './types.js';
export { EXCHANGE_PAIR_KEYS, quoteTtlMs, ratesRefreshIntervalMs } from './config.js';
export {
  getUsdPrices,
  getUsdPrice,
  listMarketRates,
  getMarketRate,
  listExchangePairs,
  getExchangePair,
  getRatesSnapshot,
  refreshMarketRates,
  startRatesAutoRefresh,
  stopRatesAutoRefresh,
  getRatesRefreshStatus,
} from './service.js';
