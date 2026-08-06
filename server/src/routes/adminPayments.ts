import type { FastifyInstance } from 'fastify';
import type { GetUserId } from './helpers.js';
import { httpError } from './helpers.js';
import {
  assertPaymentAdmin,
  listHubSettings,
  setHubSettingsBulk,
  HUB_SETTING_KEYS,
  type HubSettingKey,
  listPaymentAdmins,
  addPaymentAdmin,
  removePaymentAdmin,
  adminListPairs,
  adminUpdatePair,
  adminSetManualRate,
  adminSetStarsUsd,
  adminRefreshRates,
  adminListDeposits,
  adminListWithdrawals,
  adminUpdateWithdrawStatus,
  adminListExchanges,
  adminListLedger,
  adminSearchUser,
  adminManualCredit,
  adminManualDebit,
  adminExchangeProfitStats,
} from '../payments/hub/index.js';
import { getRatesSnapshot } from '../payments/rates/index.js';

function mapErr(err: unknown): never {
  const e = err as { statusCode?: number; message?: string };
  throw httpError(e.statusCode && e.statusCode >= 400 ? e.statusCode : 500, e.message ?? 'Admin error');
}

export function registerAdminPaymentRoutes(app: FastifyInstance, deps: { getUserId: GetUserId }) {
  const { getUserId } = deps;

  const gate = async (req: Parameters<typeof assertPaymentAdmin>[0]) => {
    try {
      return await assertPaymentAdmin(req, getUserId);
    } catch (err) {
      mapErr(err);
    }
  };

  app.get('/api/admin/payments/me', async (req) => {
    try {
      const actor = await assertPaymentAdmin(req, getUserId);
      return { isAdmin: true, actorId: actor.actorId, via: actor.via };
    } catch {
      try {
        const userId = await getUserId(req);
        return { isAdmin: false, actorId: userId, via: null };
      } catch {
        return { isAdmin: false, actorId: null, via: null };
      }
    }
  });

  app.get('/api/admin/payments/settings', async (req) => {
    const { actorId } = await gate(req);
    void actorId;
    return { settings: await listHubSettings(), keys: HUB_SETTING_KEYS };
  });

  app.put<{ Body: Record<string, unknown> }>('/api/admin/payments/settings', async (req) => {
    const { actorId } = await gate(req);
    const body = req.body ?? {};
    const patch: Partial<Record<HubSettingKey, unknown>> = {};
    for (const key of HUB_SETTING_KEYS) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        patch[key] = body[key];
      }
    }
    const settings = await setHubSettingsBulk(patch, actorId || null);
    return { ok: true, settings };
  });

  app.get('/api/admin/payments/admins', async (req) => {
    await gate(req);
    return { admins: await listPaymentAdmins() };
  });

  app.post<{ Body: { userId?: number; note?: string } }>(
    '/api/admin/payments/admins',
    async (req, reply) => {
      const { actorId } = await gate(req);
      const userId = Math.trunc(Number(req.body?.userId));
      if (!(userId > 0)) return reply.status(400).send({ message: 'Некорректный userId' });
      await addPaymentAdmin(userId, String(req.body?.note ?? ''), actorId || null);
      return { ok: true, admins: await listPaymentAdmins() };
    },
  );

  app.delete<{ Params: { userId: string } }>('/api/admin/payments/admins/:userId', async (req) => {
    await gate(req);
    const userId = Math.trunc(Number(req.params.userId));
    await removePaymentAdmin(userId);
    return { ok: true, admins: await listPaymentAdmins() };
  });

  app.get('/api/admin/payments/rates', async (req) => {
    await gate(req);
    return getRatesSnapshot();
  });

  app.post('/api/admin/payments/rates/refresh', async (req) => {
    const { actorId } = await gate(req);
    return adminRefreshRates(actorId || null);
  });

  app.post<{ Body: { base?: string; quote?: string; mid?: number } }>(
    '/api/admin/payments/rates/manual',
    async (req) => {
      const { actorId } = await gate(req);
      try {
        const rate = await adminSetManualRate(
          String(req.body?.base ?? ''),
          String(req.body?.quote ?? ''),
          Number(req.body?.mid),
          actorId || null,
        );
        return { ok: true, rate };
      } catch (err) {
        mapErr(err);
      }
    },
  );

  app.post<{ Body: { usd?: number; manual?: boolean } }>(
    '/api/admin/payments/rates/stars-usd',
    async (req) => {
      const { actorId } = await gate(req);
      try {
        const stars = await adminSetStarsUsd(
          Number(req.body?.usd),
          Boolean(req.body?.manual),
          actorId || null,
        );
        return { ok: true, stars };
      } catch (err) {
        mapErr(err);
      }
    },
  );

  app.get('/api/admin/payments/pairs', async (req) => {
    await gate(req);
    return { pairs: await adminListPairs() };
  });

  app.patch<{
    Params: { from: string; to: string };
    Body: {
      spreadBps?: number;
      feeBps?: number;
      minFromAmount?: number;
      maxFromAmount?: number;
      isActive?: boolean;
    };
  }>('/api/admin/payments/pairs/:from/:to', async (req) => {
    const { actorId } = await gate(req);
    try {
      const pair = await adminUpdatePair(req.params.from, req.params.to, req.body ?? {}, actorId || null);
      return { ok: true, pair };
    } catch (err) {
      mapErr(err);
    }
  });

  app.get('/api/admin/payments/deposits', async (req) => {
    await gate(req);
    const q = req.query as { status?: string; userId?: string; limit?: string; offset?: string };
    return adminListDeposits({
      status: q.status,
      userId: q.userId != null ? Number(q.userId) : undefined,
      limit: q.limit != null ? Number(q.limit) : undefined,
      offset: q.offset != null ? Number(q.offset) : undefined,
    });
  });

  app.get('/api/admin/payments/withdrawals', async (req) => {
    await gate(req);
    const q = req.query as { status?: string; userId?: string; limit?: string; offset?: string };
    return adminListWithdrawals({
      status: q.status,
      userId: q.userId != null ? Number(q.userId) : undefined,
      limit: q.limit != null ? Number(q.limit) : undefined,
      offset: q.offset != null ? Number(q.offset) : undefined,
    });
  });

  app.post<{ Params: { id: string }; Body: { status?: string } }>(
    '/api/admin/payments/withdrawals/:id/status',
    async (req) => {
      const { actorId } = await gate(req);
      try {
        const status = String(req.body?.status ?? '');
        if (status !== 'paid' && status !== 'rejected') {
          throw httpError(400, 'status must be paid|rejected');
        }
        return await adminUpdateWithdrawStatus(Number(req.params.id), status, actorId || null);
      } catch (err) {
        mapErr(err);
      }
    },
  );

  app.get('/api/admin/payments/exchanges', async (req) => {
    await gate(req);
    const q = req.query as { userId?: string; limit?: string; offset?: string };
    return adminListExchanges({
      userId: q.userId != null ? Number(q.userId) : undefined,
      limit: q.limit != null ? Number(q.limit) : undefined,
      offset: q.offset != null ? Number(q.offset) : undefined,
    });
  });

  app.get('/api/admin/payments/transactions', async (req) => {
    await gate(req);
    const q = req.query as { userId?: string; currency?: string; limit?: string; offset?: string };
    return adminListLedger({
      userId: q.userId != null ? Number(q.userId) : undefined,
      currency: q.currency,
      limit: q.limit != null ? Number(q.limit) : undefined,
      offset: q.offset != null ? Number(q.offset) : undefined,
    });
  });

  app.get('/api/admin/payments/users/search', async (req) => {
    await gate(req);
    const q = String((req.query as { q?: string }).q ?? '');
    try {
      return await adminSearchUser(q);
    } catch (err) {
      mapErr(err);
    }
  });

  app.post<{
    Body: { userId?: number; currency?: string; amount?: number; reason?: string };
  }>('/api/admin/payments/wallet/credit', async (req) => {
    const { actorId } = await gate(req);
    try {
      const bal = await adminManualCredit({
        userId: Number(req.body?.userId),
        currency: String(req.body?.currency ?? ''),
        amount: Number(req.body?.amount),
        reason: req.body?.reason,
        actorId: actorId || null,
      });
      return { ok: true, balance: bal };
    } catch (err) {
      mapErr(err);
    }
  });

  app.post<{
    Body: { userId?: number; currency?: string; amount?: number; reason?: string };
  }>('/api/admin/payments/wallet/debit', async (req) => {
    const { actorId } = await gate(req);
    try {
      const bal = await adminManualDebit({
        userId: Number(req.body?.userId),
        currency: String(req.body?.currency ?? ''),
        amount: Number(req.body?.amount),
        reason: req.body?.reason,
        actorId: actorId || null,
      });
      return { ok: true, balance: bal };
    } catch (err) {
      mapErr(err);
    }
  });

  app.get('/api/admin/payments/stats/exchange-profit', async (req) => {
    await gate(req);
    const q = req.query as { from?: string; to?: string };
    return adminExchangeProfitStats({ from: q.from, to: q.to });
  });
}
