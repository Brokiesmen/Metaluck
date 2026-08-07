import type { FastifyInstance } from 'fastify';
import type { GetUserId } from './helpers.js';
import { httpError, verifyAdminSecret } from './helpers.js';
import {
  cryptoWalletStatus,
  getDepositAddress,
  listCryptoDeposits,
  runCryptoListenerTick,
  isCryptoWalletEnabled,
  startCryptoDeposit,
  quoteCryptoWithdraw,
  createCryptoWithdraw,
  listCryptoWithdrawals,
  processPendingWithdrawals,
  cryptoWithdrawStatus,
} from '../payments/cryptoWallet/index.js';
import { isCryptoCurrency } from '../payments/cryptoWallet/transactionService.js';

function mapErr(err: unknown): never {
  const e = err as { statusCode?: number; message?: string };
  throw httpError(e.statusCode && e.statusCode >= 400 ? e.statusCode : 500, e.message ?? 'Crypto error');
}

export function registerCryptoWalletRoutes(app: FastifyInstance, deps: { getUserId: GetUserId }) {
  const { getUserId } = deps;

  app.get('/api/crypto/status', async () => cryptoWalletStatus());

  app.get('/api/crypto/withdraw/status', async () => cryptoWithdrawStatus());

  /**
   * Start deposit: choose currency → get personal TON address.
   * Body: { currency: 'TON' | 'USDT_TON' }
   */
  app.post<{ Body: { currency?: string } }>(
    '/api/crypto/deposit',
    {
      schema: {
        body: {
          type: 'object',
          required: ['currency'],
          properties: {
            currency: { type: 'string', enum: ['TON', 'USDT_TON'] },
          },
        },
      },
    },
    async (req) => {
      try {
        const userId = await getUserId(req);
        if (!(userId > 0)) throw httpError(401, 'Unauthorized');
        const currency = String(req.body?.currency ?? '');
        return { deposit: await startCryptoDeposit(userId, currency) };
      } catch (err) {
        mapErr(err);
      }
    },
  );

  /** Alias of POST /api/crypto/deposit (kept for older clients / partial deploys). */
  app.post<{ Body: { currency?: string } }>('/api/crypto/deposit-address', async (req) => {
    try {
      const userId = await getUserId(req);
      if (!(userId > 0)) throw httpError(401, 'Unauthorized');
      const currency = isCryptoCurrency(req.body?.currency) ? req.body!.currency! : 'TON';
      return { deposit: await startCryptoDeposit(userId, currency) };
    } catch (err) {
      mapErr(err);
    }
  });

  app.get<{ Querystring: { currency?: string } }>('/api/crypto/deposit-address', async (req) => {
    try {
      const userId = await getUserId(req);
      if (!(userId > 0)) throw httpError(401, 'Unauthorized');
      const currency = isCryptoCurrency(req.query?.currency) ? req.query.currency! : 'TON';
      let deposit = await getDepositAddress(userId, currency);
      if (!deposit && isCryptoWalletEnabled()) {
        deposit = await startCryptoDeposit(userId, currency);
      }
      return { deposit, enabled: isCryptoWalletEnabled() };
    } catch (err) {
      mapErr(err);
    }
  });

  app.get('/api/crypto/deposits', async (req) => {
    try {
      const userId = await getUserId(req);
      if (!(userId > 0)) throw httpError(401, 'Unauthorized');
      const deposits = await listCryptoDeposits(userId, 40);
      return { deposits };
    } catch (err) {
      mapErr(err);
    }
  });

  /** Quote: address + amount → fee, net, limits (no lock). */
  app.post<{
    Body: { currency?: string; toAddress?: string; amount?: number | string };
  }>('/api/crypto/withdraw/quote', async (req) => {
    try {
      const userId = await getUserId(req);
      const quote = await quoteCryptoWithdraw(
        userId,
        String(req.body?.currency ?? ''),
        String(req.body?.toAddress ?? ''),
        req.body?.amount ?? 0,
      );
      return { quote };
    } catch (err) {
      mapErr(err);
    }
  });

  /**
   * Create withdrawal (requires confirm: true).
   * Locks balance → pending → processor sends → completed + tx hash.
   */
  app.post<{
    Body: {
      currency?: string;
      toAddress?: string;
      amount?: number | string;
      confirm?: boolean;
    };
  }>(
    '/api/crypto/withdraw',
    {
      schema: {
        body: {
          type: 'object',
          required: ['currency', 'toAddress', 'amount', 'confirm'],
          properties: {
            currency: { type: 'string', enum: ['TON', 'USDT_TON'] },
            toAddress: { type: 'string', minLength: 10 },
            amount: {},
            confirm: { type: 'boolean' },
          },
        },
      },
    },
    async (req) => {
      try {
        const userId = await getUserId(req);
        const withdrawal = await createCryptoWithdraw({
          userId,
          currency: String(req.body?.currency ?? ''),
          toAddress: String(req.body?.toAddress ?? ''),
          amount: req.body?.amount ?? 0,
          confirm: req.body?.confirm === true,
        });
        // Kick processor asynchronously
        void processPendingWithdrawals().catch(() => {});
        return { withdrawal };
      } catch (err) {
        mapErr(err);
      }
    },
  );

  app.get('/api/crypto/withdrawals', async (req) => {
    try {
      const userId = await getUserId(req);
      if (!(userId > 0)) throw httpError(401, 'Unauthorized');
      const withdrawals = await listCryptoWithdrawals(userId, 40);
      return { withdrawals };
    } catch (err) {
      mapErr(err);
    }
  });

  /** Scan deposits + process pending withdrawals. */
  app.post('/api/crypto/sync', async (req) => {
    try {
      const userId = await getUserId(req);
      if (!(userId > 0)) throw httpError(401, 'Unauthorized');
      await startCryptoDeposit(userId, 'TON');
      await runCryptoListenerTick();
      const [deposits, withdrawals] = await Promise.all([
        listCryptoDeposits(userId, 20),
        listCryptoWithdrawals(userId, 20),
      ]);
      return { ok: true, deposits, withdrawals };
    } catch (err) {
      mapErr(err);
    }
  });

  app.post('/api/admin/crypto/listener/tick', async (req, reply) => {
    if (!verifyAdminSecret(req)) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }
    await runCryptoListenerTick();
    return { ok: true };
  });

  app.post('/api/admin/crypto/withdraw/tick', async (req, reply) => {
    if (!verifyAdminSecret(req)) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }
    const result = await processPendingWithdrawals();
    return { ok: true, ...result };
  });
}
