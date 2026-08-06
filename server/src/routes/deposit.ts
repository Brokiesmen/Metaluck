import type { FastifyInstance } from 'fastify';
import { getBalance } from '../supabaseStore.js';
import {
  createCryptoDeposit,
  createStarsDeposit,
  getDepositMethods,
  getDepositStatus,
  getStarsPackages,
  listDeposits,
  verifyCryptoDeposit,
} from '../payments/deposit/index.js';
import type { GetUserId } from './helpers.js';
import { httpError } from './helpers.js';

function mapErr(err: unknown): never {
  const e = err as { statusCode?: number; message?: string };
  const code = e.statusCode ?? 500;
  const msg = e.message ?? 'Deposit error';
  if (msg === 'UNKNOWN_PACKAGE') throw httpError(400, 'Неизвестный пакет пополнения.');
  if (msg === 'INVOICE_CREATE_FAILED') throw httpError(500, 'Не удалось создать счёт. Попробуйте ещё раз.');
  if (msg === 'CRYPTO_DEPOSIT_DISABLED') {
    throw httpError(503, 'Крипто-депозиты временно недоступны (не задан TON_DEPOSIT_ADDRESS).');
  }
  if (msg === 'INVALID_AMOUNT') throw httpError(400, 'Некорректная сумма.');
  if (msg === 'AMOUNT_BELOW_MIN') throw httpError(400, 'Сумма ниже минимума.');
  if (msg === 'NOT_FOUND') throw httpError(404, 'Депозит не найден.');
  if (msg === 'NOT_CRYPTO') throw httpError(400, 'Это не крипто-депозит.');
  throw httpError(code >= 400 && code < 600 ? code : 500, msg);
}

export function registerDepositRoutes(app: FastifyInstance, deps: { getUserId: GetUserId }) {
  const { getUserId } = deps;

  app.get('/api/deposit/methods', async () => ({
    methods: await getDepositMethods(),
  }));

  app.get('/api/deposit/packages', async () => ({
    packages: getStarsPackages(),
  }));

  app.get('/api/deposit', async (req) => {
    const userId = await getUserId(req);
    const q = req.query as { limit?: string; offset?: string };
    return listDeposits(userId, {
      limit: q.limit != null ? Number(q.limit) : 20,
      offset: q.offset != null ? Number(q.offset) : 0,
    });
  });

  app.post<{ Body: { packageId: string } }>(
    '/api/deposit/stars/invoice',
    {
      schema: {
        body: {
          type: 'object',
          required: ['packageId'],
          properties: { packageId: { type: 'string' } },
        },
      },
    },
    async (req, reply) => {
      const userId = await getUserId(req);
      if (userId <= 0) {
        return reply.status(400).send({ message: 'Оплата доступна только внутри Telegram Mini App.' });
      }
      try {
        const view = await createStarsDeposit({ userId, packageId: req.body.packageId });
        return {
          id: view.id,
          invoiceLink: view.invoiceLink,
          payload: view.id,
          packageId: view.packageId,
          expectedAmount: view.expectedAmount,
        };
      } catch (err) {
        mapErr(err);
      }
    },
  );

  app.get<{ Params: { id: string } }>('/api/deposit/stars/status/:id', async (req, reply) => {
    const userId = await getUserId(req);
    try {
      const view = await getDepositStatus(req.params.id, userId, { verifyCrypto: false });
      const newBalance =
        view.status === 'paid' && view.productKind === 'wallet_credit'
          ? await getBalance(userId)
          : null;
      return {
        id: view.id,
        status: view.status,
        balanceAmount: view.expectedAmount,
        receivedAmount: view.receivedAmount,
        newBalance,
        packageId: view.packageId,
      };
    } catch (err) {
      if ((err as { message?: string }).message === 'NOT_FOUND') {
        return reply.status(404).send({ message: 'Платёж не найден' });
      }
      mapErr(err);
    }
  });

  app.post<{ Body: { currency: string; amount: number | string } }>(
    '/api/deposit/crypto/intent',
    {
      schema: {
        body: {
          type: 'object',
          required: ['currency', 'amount'],
          properties: {
            currency: { type: 'string' },
            amount: { type: ['number', 'string'] },
          },
        },
      },
    },
    async (req, reply) => {
      const userId = await getUserId(req);
      if (userId <= 0) {
        return reply.status(400).send({ message: 'Депозит доступен только внутри Telegram Mini App.' });
      }
      const currency = String(req.body.currency ?? '').trim().toUpperCase();
      if (currency !== 'TON' && currency !== 'USDT_TON') {
        return reply.status(400).send({ message: 'Поддерживаются только TON и USDT_TON.' });
      }
      try {
        const view = await createCryptoDeposit({
          userId,
          currency,
          amount: Number(req.body.amount),
        });
        return view;
      } catch (err) {
        mapErr(err);
      }
    },
  );

  app.post<{ Params: { id: string } }>('/api/deposit/:id/verify', async (req) => {
    const userId = await getUserId(req);
    try {
      return await verifyCryptoDeposit(req.params.id, userId);
    } catch (err) {
      mapErr(err);
    }
  });

  app.get<{ Params: { id: string } }>('/api/deposit/:id', async (req) => {
    const userId = await getUserId(req);
    try {
      const view = await getDepositStatus(req.params.id, userId);
      if (view.status === 'paid' && view.currency === 'STARS' && view.productKind === 'wallet_credit') {
        return { ...view, newBalance: await getBalance(userId) };
      }
      return view;
    } catch (err) {
      mapErr(err);
    }
  });
}
