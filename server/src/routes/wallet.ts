import type { FastifyInstance } from 'fastify';
import {
  catalogList,
  getWalletBalance,
  getWalletLedger,
  getWalletSnapshot,
  isWalletCurrency,
} from '../payments/wallet/index.js';
import type { GetUserId } from './helpers.js';
import { httpError } from './helpers.js';

export function registerWalletRoutes(app: FastifyInstance, deps: { getUserId: GetUserId }) {
  const { getUserId } = deps;

  app.get('/api/wallet/currencies', async () => ({
    currencies: catalogList(),
  }));

  app.get('/api/wallet', async (req) => {
    const userId = await getUserId(req);
    const snapshot = await getWalletSnapshot(userId);
    const stars = snapshot.balances.find((b) => b.currency === 'STARS');
    return {
      userId: snapshot.userId,
      balances: snapshot.balances,
      /** Compat: same field as GET /api/balance (STARS available). */
      balance: stars?.available ?? 0,
    };
  });

  app.get('/api/wallet/ledger', async (req) => {
    const userId = await getUserId(req);
    const q = req.query as { currency?: string; limit?: string; offset?: string; page?: string };
    const currency = q.currency?.trim();
    if (currency && !isWalletCurrency(currency)) {
      throw httpError(400, 'invalid currency');
    }
    const limit = q.limit != null ? Number(q.limit) : 20;
    const page = q.page != null ? Math.max(0, Math.floor(Number(q.page))) : 0;
    const offset =
      q.offset != null ? Math.max(0, Math.floor(Number(q.offset))) : page * Math.min(100, Math.max(1, Math.floor(limit) || 20));

    const { total, entries } = await getWalletLedger(userId, {
      currency: currency && isWalletCurrency(currency) ? currency : undefined,
      limit,
      offset,
    });
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit) || 20));
    return {
      entries,
      pagination: {
        page: Math.floor(offset / safeLimit),
        limit: safeLimit,
        offset,
        total,
        hasMore: offset + entries.length < total,
      },
    };
  });

  app.get<{ Params: { currency: string } }>('/api/wallet/:currency', async (req) => {
    const userId = await getUserId(req);
    const code = String(req.params.currency ?? '').trim().toUpperCase();
    if (!isWalletCurrency(code)) {
      throw httpError(400, 'invalid currency');
    }
    return getWalletBalance(userId, code);
  });
}
