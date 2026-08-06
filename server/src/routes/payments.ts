import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';
import {
  PREMIUM_WHEEL_PACKAGE_ID,
  PREMIUM_WHEEL_XTR,
} from '../wheel.js';
import {
  failTopupOrder,
  getBalance,
  getTopupOrderForUser,
  insertTopupOrder,
} from '../supabaseStore.js';
import type { GetUserId } from './helpers.js';
import { telegramJsonMethod } from './helpers.js';

export const TOPUP_PACKAGES = [
  { id: 'xtr_25', xtrAmount: 25, balanceAmount: 25, label: '25 звёзд', popular: false },
  { id: 'xtr_50', xtrAmount: 50, balanceAmount: 50, label: '50 звёзд', popular: true },
  { id: 'xtr_100', xtrAmount: 100, balanceAmount: 100, label: '100 звёзд', popular: false },
  { id: 'xtr_500', xtrAmount: 500, balanceAmount: 500, label: '500 звёзд', popular: false },
] as const;

export const PREMIUM_WHEEL_PACKAGE = {
  id: PREMIUM_WHEEL_PACKAGE_ID,
  xtrAmount: PREMIUM_WHEEL_XTR,
  balanceAmount: 0,
  label: 'Премиум фортуна ×1',
  popular: false,
} as const;

export const PRE_CHECKOUT_DEADLINE_MS = Math.min(
  9700,
  Math.max(2500, Number(process.env.PRE_CHECKOUT_DEADLINE_MS ?? 9000)),
);

export function getTopupPackageById(packageId: string) {
  return TOPUP_PACKAGES.find((p) => p.id === packageId) ?? null;
}

export function getInvoicePackageById(packageId: string) {
  if (packageId === PREMIUM_WHEEL_PACKAGE.id) return PREMIUM_WHEEL_PACKAGE;
  return getTopupPackageById(packageId);
}

export function buildTopupPayload(userId: number, packageId: string): string {
  const nonce = crypto.randomBytes(6).toString('hex');
  const payload = `mg:1:${userId}:${packageId}:${nonce}`;
  if (payload.length > 128) {
    throw new Error('Invoice payload too long');
  }
  return payload;
}

export function parseTopupPayload(payload: string) {
  const parts = String(payload ?? '').split(':');
  if (parts.length !== 5 || parts[0] !== 'mg' || parts[1] !== '1') {
    throw new Error('INVALID_PAYLOAD');
  }
  const userId = Number(parts[2]);
  const packageId = parts[3];
  if (!Number.isFinite(userId) || userId <= 0 || !getInvoicePackageById(packageId)) {
    throw new Error('INVALID_PAYLOAD');
  }
  return { userId, packageId };
}

export async function createTopupInvoiceLink(
  userId: number,
  pkg: { label: string; balanceAmount: number; xtrAmount: number },
  payload: string,
) {
  const isWheel = pkg.balanceAmount === 0;
  const body: Record<string, unknown> = {
    title: isWheel ? 'Премиум фортуна' : `Пополнение ${pkg.label}`,
    description: isWheel
      ? `1 вращение премиум-колеса за ${pkg.xtrAmount} Telegram Stars.`
      : `Пополнение баланса на ${pkg.balanceAmount} звёзд за ${pkg.xtrAmount} XTR.`,
    payload,
    currency: 'XTR',
    provider_token: '',
    prices: [{ label: pkg.label, amount: pkg.xtrAmount }],
  };
  const photoUrl = String(process.env.STARS_INVOICE_PHOTO_URL ?? '').trim();
  if (photoUrl) {
    body.photo_url = photoUrl;
  }
  return telegramJsonMethod<string>('createInvoiceLink', body);
}

export async function answerPreCheckoutQuery(
  preCheckoutQueryId: string,
  ok: boolean,
  opts: { error_message?: string } = {},
) {
  return telegramJsonMethod(
    'answerPreCheckoutQuery',
    {
      pre_checkout_query_id: preCheckoutQueryId,
      ok,
      ...opts,
    },
    5000,
  );
}

interface CreateInvoiceBody {
  packageId: string;
}

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

      const pkg = getTopupPackageById(req.body.packageId);
      if (!pkg) {
        return reply.status(400).send({ message: 'Неизвестный пакет пополнения.' });
      }

      const payload = buildTopupPayload(userId, pkg.id);
      const now = Date.now();
      await insertTopupOrder({
        payload,
        user_id: userId,
        package_id: pkg.id,
        xtr_amount: pkg.xtrAmount,
        balance_amount: pkg.balanceAmount,
        created_at: now,
        updated_at: now,
      });

      try {
        const invoiceLink = await createTopupInvoiceLink(userId, pkg, payload);
        return { invoiceLink, payload };
      } catch (err) {
        await failTopupOrder(
          payload,
          err instanceof Error ? err.message : 'INVOICE_CREATE_FAILED',
        );
        return reply.status(500).send({ message: 'Не удалось создать счёт. Попробуйте ещё раз.' });
      }
    },
  );

  app.get<{ Params: { payload: string } }>('/api/topup/status/:payload', async (req, reply) => {
    const userId = await getUserId(req);
    const row = await getTopupOrderForUser(req.params.payload, userId);

    if (!row) {
      return reply.status(404).send({ message: 'Платёж не найден' });
    }

    return {
      status: row.status,
      balanceAmount: row.balance_amount,
      newBalance: row.status === 'paid' ? await getBalance(userId) : null,
    };
  });
}
