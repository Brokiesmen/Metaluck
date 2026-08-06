import { getSupabase } from '../../supabaseStore.js';
import { WALLET_CATALOG, type WalletCurrency } from '../wallet/index.js';
import {
  getExchangePair,
  getMarketRate,
  listExchangePairs,
  listMarketRates,
  type RateCurrency,
} from '../rates/index.js';
import {
  executeExchangeTransaction,
  listExchangeOrders,
  type ExchangeOrderRecord,
  writePaymentAudit,
} from '../transactions/index.js';
import { getWalletSnapshot } from '../wallet/index.js';
import {
  isCryptoWalletEnabled,
  isCryptoWithdrawEnabled,
} from '../cryptoWallet/config.js';

export interface ExchangeQuoteView {
  quoteId: string;
  from: WalletCurrency;
  to: WalletCurrency;
  fromAmount: number;
  toAmount: number;
  feeAmount: number;
  feeCurrency: WalletCurrency;
  midRate: number;
  effectiveRate: number;
  spreadBps: number;
  feeBps: number;
  expiresAt: string;
  createdAt: string;
}

export interface ExchangeFlowHint {
  id: 'deposit_ton_to_stars' | 'deposit_usdt_to_ton' | 'withdraw_ton';
  from: WalletCurrency | null;
  to: WalletCurrency | null;
  depositCurrency: WalletCurrency | null;
  withdrawCurrency: WalletCurrency | null;
}

export interface ExchangeWalletContext {
  /** Real custodial balances (same ledger crypto deposits credit into). */
  balances: Array<{
    currency: WalletCurrency;
    available: number;
    locked: number;
    decimals: number;
    displaySymbol: string;
  }>;
  deposit: {
    enabled: boolean;
    currencies: Array<'TON' | 'USDT_TON'>;
  };
  withdraw: {
    enabled: boolean;
    currencies: Array<'TON' | 'USDT_TON'>;
  };
  flows: ExchangeFlowHint[];
  currencies: Array<'STARS' | 'TON' | 'USDT_TON'>;
}

function isRateCurrency(v: unknown): v is RateCurrency {
  return v === 'STARS' || v === 'TON' || v === 'USDT_TON';
}

function throwHttp(statusCode: number, message: string): never {
  throw Object.assign(new Error(message), { statusCode });
}

function amountToMajor(amount: number, currency: WalletCurrency): number {
  const d = WALLET_CATALOG[currency].decimals;
  return amount / 10 ** d;
}

function majorToAmount(major: number, currency: WalletCurrency): number {
  const d = WALLET_CATALOG[currency].decimals;
  return Math.floor(major * 10 ** d + 1e-12);
}

/**
 * Build quote amounts: mid from market, user rate worsened by spread, fee taken from output.
 */
export function computeExchangeAmounts(args: {
  from: WalletCurrency;
  to: WalletCurrency;
  fromAmount: number;
  midRate: number;
  spreadBps: number;
  feeBps: number;
}): { toAmount: number; feeAmount: number; effectiveRate: number } {
  const fromMajorUnits = amountToMajor(args.fromAmount, args.from);
  const effectiveRate = args.midRate * (1 - args.spreadBps / 10_000);
  if (!(effectiveRate > 0)) throwHttp(500, 'INVALID_RATE');

  const toMajorGross = fromMajorUnits * effectiveRate;
  const feeMajor = toMajorGross * (args.feeBps / 10_000);
  const toMajorNet = toMajorGross - feeMajor;
  if (!(toMajorNet > 0)) throwHttp(400, 'AMOUNT_TOO_SMALL');

  const toAmount = majorToAmount(toMajorNet, args.to);
  const feeAmount = majorToAmount(feeMajor, args.to);
  if (toAmount <= 0) throwHttp(400, 'AMOUNT_TOO_SMALL');

  return { toAmount, feeAmount, effectiveRate };
}

export async function getExchangeCatalog() {
  const [pairs, rates] = await Promise.all([listExchangePairs(), listMarketRates()]);
  return {
    pairs: pairs.map((p) => ({
      from: p.from,
      to: p.to,
      spreadBps: p.spreadBps,
      feeBps: p.feeBps,
      minFromAmount: p.minFromAmount,
      maxFromAmount: p.maxFromAmount,
      decimalsFrom: WALLET_CATALOG[p.from].decimals,
      decimalsTo: WALLET_CATALOG[p.to].decimals,
    })),
    rates,
    currencies: ['STARS', 'TON', 'USDT_TON'] as const,
    rails: {
      deposit: isCryptoWalletEnabled(),
      withdraw: isCryptoWithdrawEnabled(),
    },
  };
}

/**
 * Real TON / USDT / Stars balances + crypto deposit/withdraw rails for Exchange UI.
 * Does not change quote/execute math.
 */
export async function getExchangeWalletContext(userId: number): Promise<ExchangeWalletContext> {
  const snapshot = userId > 0 ? await getWalletSnapshot(userId) : { userId: 0, balances: [] as Awaited<ReturnType<typeof getWalletSnapshot>>['balances'] };
  return {
    balances: snapshot.balances.map((b) => ({
      currency: b.currency,
      available: b.available,
      locked: b.locked,
      decimals: b.decimals,
      displaySymbol: b.displaySymbol,
    })),
    deposit: {
      enabled: isCryptoWalletEnabled(),
      currencies: ['TON', 'USDT_TON'],
    },
    withdraw: {
      enabled: isCryptoWithdrawEnabled(),
      currencies: ['TON', 'USDT_TON'],
    },
    flows: [
      {
        id: 'deposit_ton_to_stars',
        from: 'TON',
        to: 'STARS',
        depositCurrency: 'TON',
        withdrawCurrency: null,
      },
      {
        id: 'deposit_usdt_to_ton',
        from: 'USDT_TON',
        to: 'TON',
        depositCurrency: 'USDT_TON',
        withdrawCurrency: null,
      },
      {
        id: 'withdraw_ton',
        from: null,
        to: null,
        depositCurrency: null,
        withdrawCurrency: 'TON',
      },
    ],
    currencies: ['STARS', 'TON', 'USDT_TON'],
  };
}

export async function createExchangeQuote(args: {
  userId: number;
  from: string;
  to: string;
  amount: number;
}): Promise<ExchangeQuoteView> {
  if (!isRateCurrency(args.from) || !isRateCurrency(args.to)) {
    throwHttp(400, 'INVALID_PAIR');
  }
  if (args.from === args.to) throwHttp(400, 'INVALID_PAIR');

  const fromAmount = Math.trunc(Number(args.amount));
  if (!Number.isFinite(fromAmount) || fromAmount <= 0) throwHttp(400, 'INVALID_AMOUNT');

  const pair = await getExchangePair(args.from, args.to);
  if (!pair) throwHttp(400, 'PAIR_DISABLED');

  if (fromAmount < pair.minFromAmount) throwHttp(400, 'BELOW_MIN');
  if (fromAmount > pair.maxFromAmount) throwHttp(400, 'ABOVE_MAX');

  // Rates only via Market Rates Service (Redis-backed) — no direct oracle calls.
  const rate = await getMarketRate(args.from, args.to);
  if (!rate || !(rate.mid > 0)) throwHttp(503, 'RATE_UNAVAILABLE');

  const { toAmount, feeAmount, effectiveRate } = computeExchangeAmounts({
    from: args.from,
    to: args.to,
    fromAmount,
    midRate: rate.mid,
    spreadBps: pair.spreadBps,
    feeBps: pair.feeBps,
  });

  const { getExchangeQuoteTtlMs } = await import('../hub/settings.js');
  const expiresAt = new Date(Date.now() + (await getExchangeQuoteTtlMs())).toISOString();
  const sb = getSupabase();
  const { data, error } = await sb
    .from('exchange_quotes')
    .insert({
      user_id: args.userId,
      from_currency: args.from,
      to_currency: args.to,
      from_amount: fromAmount,
      to_amount: toAmount,
      fee_amount: feeAmount,
      fee_currency: args.to,
      mid_rate: rate.mid,
      effective_rate: effectiveRate,
      spread_bps: pair.spreadBps,
      fee_bps: pair.feeBps,
      status: 'open',
      expires_at: expiresAt,
      meta: { source: rate.source, fetchedAt: rate.fetchedAt },
    })
    .select(
      'id, from_currency, to_currency, from_amount, to_amount, fee_amount, fee_currency, mid_rate, effective_rate, spread_bps, fee_bps, expires_at, created_at',
    )
    .single();
  if (error) throw new Error(`createExchangeQuote: ${error.message}`);

  return {
    quoteId: String(data.id),
    from: data.from_currency as WalletCurrency,
    to: data.to_currency as WalletCurrency,
    fromAmount: Number(data.from_amount),
    toAmount: Number(data.to_amount),
    feeAmount: Number(data.fee_amount),
    feeCurrency: data.fee_currency as WalletCurrency,
    midRate: Number(data.mid_rate),
    effectiveRate: Number(data.effective_rate),
    spreadBps: Number(data.spread_bps),
    feeBps: Number(data.fee_bps),
    expiresAt: String(data.expires_at),
    createdAt: String(data.created_at),
  };
}

export async function executeExchange(args: {
  userId: number;
  quoteId: string;
}): Promise<{
  order: ExchangeOrderRecord;
  balances: Awaited<ReturnType<typeof getWalletSnapshot>>['balances'];
}> {
  const quoteId = String(args.quoteId ?? '').trim();
  if (!quoteId) throwHttp(400, 'INVALID_QUOTE');

  // Debits/credits via Transaction Service → exchange_execute_quote RPC (Wallet ledger).
  try {
    const order = await executeExchangeTransaction(quoteId, args.userId);
    await writePaymentAudit({
      userId: args.userId,
      operation: 'exchange_execute',
      outcome: 'ok',
      currency: order.fromCurrency,
      amount: order.fromAmount,
      refTable: 'exchange_orders',
      refId: String(order.id),
      meta: {
        quoteId: order.quoteId,
        toCurrency: order.toCurrency,
        toAmount: order.toAmount,
        feeAmount: order.feeAmount,
      },
    });
    const snapshot = await getWalletSnapshot(args.userId);
    return { order, balances: snapshot.balances };
  } catch (err) {
    await writePaymentAudit({
      userId: args.userId,
      operation: 'exchange_execute',
      outcome: 'failed',
      reason: err instanceof Error ? err.message : String(err),
      meta: { quoteId },
    });
    throw err;
  }
}

export async function getExchangeHistory(
  userId: number,
  opts?: { limit?: number; offset?: number },
) {
  return listExchangeOrders(userId, opts);
}

export type { ExchangeOrderRecord };
