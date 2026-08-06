import type { FastifyInstance } from 'fastify';
import {
  createExchangeQuote,
  executeExchange,
  getExchangeCatalog,
  getExchangeHistory,
  getExchangeWalletContext,
} from '../payments/exchange/index.js';
import {
  getMarketRate,
  getRatesSnapshot,
  refreshMarketRates,
  getRatesRefreshStatus,
} from '../payments/rates/index.js';
import { listUserTransactions } from '../payments/transactions/index.js';
import type { GetUserId } from './helpers.js';
import { httpError, verifyAdminSecret } from './helpers.js';

function mapExchangeErr(err: unknown): never {
  const e = err as { statusCode?: number; message?: string };
  const msg = e.message ?? 'Exchange error';
  const map: Record<string, [number, string]> = {
    INVALID_PAIR: [400, 'Неподдерживаемая пара обмена.'],
    INVALID_AMOUNT: [400, 'Некорректная сумма.'],
    PAIR_DISABLED: [400, 'Пара обмена отключена.'],
    BELOW_MIN: [400, 'Сумма ниже минимума.'],
    ABOVE_MAX: [400, 'Сумма выше максимума.'],
    AMOUNT_TOO_SMALL: [400, 'После комиссии сумма слишком мала.'],
    RATE_UNAVAILABLE: [503, 'Курс временно недоступен. Попробуйте позже.'],
    INVALID_QUOTE: [400, 'Некорректная котировка.'],
    INSUFFICIENT_BALANCE: [400, 'Недостаточно средств.'],
    QUOTE_EXPIRED: [400, 'Котировка истекла. Запросите новую.'],
    QUOTE_NOT_FOUND: [404, 'Котировка не найдена.'],
    QUOTE_FORBIDDEN: [403, 'Чужая котировка.'],
    QUOTE_NOT_OPEN: [400, 'Котировка уже использована или отменена.'],
    INVALID_RATE: [500, 'Ошибка расчёта курса.'],
  };
  const hit = map[msg];
  if (hit) throw httpError(hit[0], hit[1]);
  throw httpError(e.statusCode && e.statusCode >= 400 ? e.statusCode : 500, msg);
}

export function registerExchangeRoutes(app: FastifyInstance, deps: { getUserId: GetUserId }) {
  const { getUserId } = deps;

  app.get('/api/rates', async () => getRatesSnapshot());

  app.get('/api/rates/usd', async () => {
    const snap = await getRatesSnapshot();
    return snap.usd;
  });

  app.get<{ Params: { from: string; to: string } }>('/api/rates/:from/:to', async (req, reply) => {
    const from = String(req.params.from ?? '').toUpperCase();
    const to = String(req.params.to ?? '').toUpperCase();
    if (from === 'USD' || to === 'USD') {
      // /api/rates/TON/USD style — served from Market Rates USD book
      const snap = await getRatesSnapshot();
      const cur = from === 'USD' ? to : from;
      if (cur !== 'STARS' && cur !== 'TON' && cur !== 'USDT_TON') {
        return reply.status(400).send({ message: 'Неизвестная валюта.' });
      }
      const map: Record<string, number> = {
        'TON/USD': snap.usd['TON/USD'],
        'USDT/USD': snap.usd['USDT/USD'],
        'STARS/USD': snap.usd['STARS/USD'],
      };
      return {
        base: cur,
        quote: 'USD',
        mid: map[`${cur}/USD`],
        source: snap.usd.source,
        fetchedAt: snap.usd.fetchedAt,
      };
    }
    if (
      (from !== 'STARS' && from !== 'TON' && from !== 'USDT_TON') ||
      (to !== 'STARS' && to !== 'TON' && to !== 'USDT_TON')
    ) {
      return reply.status(400).send({ message: 'Неизвестная валюта.' });
    }
    const rate = await getMarketRate(from, to);
    if (!rate) return reply.status(404).send({ message: 'Курс не найден.' });
    return rate;
  });

  app.post('/api/admin/rates/refresh', async (req, reply) => {
    if (!verifyAdminSecret(req)) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }
    const rates = await refreshMarketRates(true);
    return { ok: true, rates, ...getRatesRefreshStatus() };
  });

  app.get('/api/exchange/pairs', async () => getExchangeCatalog());

  /**
   * Real wallet balances (TON / USDT / Stars) + crypto deposit/withdraw rails.
   * Exchange quote/execute logic is unchanged — this only exposes funding context.
   */
  app.get('/api/exchange/status', async (req) => {
    const userId = await getUserId(req);
    return getExchangeWalletContext(userId);
  });

  app.post<{ Body: { from: string; to: string; amount: number | string } }>(
    '/api/exchange/quote',
    {
      schema: {
        body: {
          type: 'object',
          required: ['from', 'to', 'amount'],
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            amount: { type: ['number', 'string'] },
          },
        },
      },
    },
    async (req) => {
      const userId = await getUserId(req);
      try {
        return await createExchangeQuote({
          userId,
          from: String(req.body.from ?? '').toUpperCase(),
          to: String(req.body.to ?? '').toUpperCase(),
          amount: Number(req.body.amount),
        });
      } catch (err) {
        mapExchangeErr(err);
      }
    },
  );

  app.post<{ Body: { quoteId: string } }>(
    '/api/exchange/execute',
    {
      schema: {
        body: {
          type: 'object',
          required: ['quoteId'],
          properties: { quoteId: { type: 'string' } },
        },
      },
    },
    async (req) => {
      const userId = await getUserId(req);
      try {
        return await executeExchange({
          userId,
          quoteId: String(req.body.quoteId ?? ''),
        });
      } catch (err) {
        mapExchangeErr(err);
      }
    },
  );

  app.get('/api/exchange/history', async (req) => {
    const userId = await getUserId(req);
    const q = req.query as { limit?: string; offset?: string };
    const { total, orders } = await getExchangeHistory(userId, {
      limit: q.limit != null ? Number(q.limit) : 20,
      offset: q.offset != null ? Number(q.offset) : 0,
    });
    return { total, orders };
  });

  app.get('/api/transactions', async (req) => {
    const userId = await getUserId(req);
    const q = req.query as { limit?: string; offset?: string; kind?: string };
    const kind =
      q.kind === 'exchange' || q.kind === 'ledger' || q.kind === 'all' ? q.kind : 'all';
    return listUserTransactions(userId, {
      limit: q.limit != null ? Number(q.limit) : 20,
      offset: q.offset != null ? Number(q.offset) : 0,
      kind,
    });
  });
}
