import type { FastifyInstance } from 'fastify';
import { getBalance, getTopupOrderForUser } from '../supabaseStore.js';
import {
  PRE_CHECKOUT_DEADLINE_MS,
  PREMIUM_WHEEL_PACKAGE,
  TOPUP_PACKAGES,
  answerPreCheckoutQuery,
  buildTopupPayload,
  createStarsDeposit,
  createTopupInvoiceLink,
  getDepositStatus,
  getInvoicePackageById,
  getTopupPackageById,
  parseTopupPayload,
} from '../payments/deposit/index.js';
import type { GetUserId } from './helpers.js';

export {
  TOPUP_PACKAGES,
  PREMIUM_WHEEL_PACKAGE,
  PRE_CHECKOUT_DEADLINE_MS,
  getTopupPackageById,
  getInvoicePackageById,
  buildTopupPayload,
  parseTopupPayload,
  createTopupInvoiceLink,
  answerPreCheckoutQuery,
};

interface CreateInvoiceBody {
  packageId: string;
}

/** Legacy /api/topup/* — thin aliases over Deposit Service. */
export function registerPaymentsRoutes(app: FastifyInstance, deps: { getUserId: GetUserId }) {
  const { getUserId } = deps;

  app.get('/api/topup/packages', async () => ({
    packages: TOPUP_PACKAGES,
  }));

  app.post<{ Body: CreateInvoiceBody }>(
    '/api/topup/create-invoice',
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
        return { invoiceLink: view.invoiceLink, payload: view.id };
      } catch (err) {
        const msg = (err as Error)?.message ?? '';
        if (msg === 'UNKNOWN_PACKAGE') {
          return reply.status(400).send({ message: 'Неизвестный пакет пополнения.' });
        }
        return reply.status(500).send({ message: 'Не удалось создать счёт. Попробуйте ещё раз.' });
      }
    },
  );

  app.get<{ Params: { payload: string } }>('/api/topup/status/:payload', async (req, reply) => {
    const userId = await getUserId(req);
    try {
      const view = await getDepositStatus(req.params.payload, userId, { verifyCrypto: false });
      return {
        status: view.status === 'paid' ? 'paid' : view.status,
        balanceAmount: view.expectedAmount,
        newBalance:
          view.status === 'paid' && view.productKind === 'wallet_credit'
            ? await getBalance(userId)
            : null,
      };
    } catch {
      const row = await getTopupOrderForUser(req.params.payload, userId);
      if (!row) {
        return reply.status(404).send({ message: 'Платёж не найден' });
      }
      return {
        status: row.status,
        balanceAmount: row.balance_amount,
        newBalance: row.status === 'paid' ? await getBalance(userId) : null,
      };
    }
  });
}
