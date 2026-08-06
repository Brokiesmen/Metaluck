import type { FastifyInstance } from 'fastify';
import { validateInitData } from '../auth.js';
import {
  addBalance,
  createWithdrawOrder,
  getBalance,
  getProfile,
  listWithdrawOrders,
  tryDeductBalance,
} from '../supabaseStore.js';
import type { GetUserId } from './helpers.js';
import { telegramJsonMethod } from './helpers.js';
import { getWithdrawMinStars, getWithdrawPresets } from '../payments/hub/index.js';

export function registerWithdrawRoutes(app: FastifyInstance, deps: { getUserId: GetUserId }) {
  const { getUserId } = deps;

  app.get('/api/withdraw/info', async (req) => {
    const userId = await getUserId(req);
    const [balance, minAmount, presets] = await Promise.all([
      getBalance(userId),
      getWithdrawMinStars(),
      getWithdrawPresets(),
    ]);
    const recent = userId > 0 ? await listWithdrawOrders(userId, 5) : [];
    return {
      balance,
      minAmount,
      presets,
      recent,
    };
  });

  app.post<{ Body: { amount?: number } }>(
    '/api/withdraw/create',
    {
      schema: {
        body: {
          type: 'object',
          required: ['amount'],
          properties: { amount: { type: 'number' } },
        },
      },
    },
    async (req, reply) => {
      const userId = await getUserId(req);
      if (userId <= 0) {
        return reply.status(400).send({ message: 'Вывод доступен только внутри Telegram Mini App.' });
      }

      const amount = Math.floor(Number(req.body?.amount));
      const minWithdraw = await getWithdrawMinStars();
      if (!Number.isFinite(amount) || amount < minWithdraw) {
        return reply.status(400).send({ message: `Минимальная сумма вывода — ${minWithdraw} ★` });
      }

      const newBalance = await tryDeductBalance(userId, amount);
      if (newBalance === null) {
        return reply.status(400).send({ message: 'Недостаточно звёзд на балансе' });
      }

      const profile = await getProfile(userId);
      const rawInit = req.headers['x-telegram-init-data'] as string | undefined;
      const validated = validateInitData(rawInit);
      const username =
        validated.valid && validated.user?.username
          ? String(validated.user.username)
          : null;

      let order;
      try {
        order = await createWithdrawOrder({
          user_id: userId,
          amount,
          username,
          display_name: profile?.name ?? null,
        });
      } catch (err) {
        await addBalance(userId, amount);
        throw err;
      }

      const adminChat = String(process.env.TELEGRAM_ADMIN_CHAT_ID ?? '').trim();
      if (adminChat) {
        const who = username ? `@${username}` : (profile?.name ?? `id ${userId}`);
        telegramJsonMethod('sendMessage', {
          chat_id: adminChat,
          text: `💸 Заявка на вывод #${order.id}\n${who}\nСумма: ${amount} ★\nuser_id: ${userId}`,
        }).catch(() => {});
      }

      return {
        ok: true,
        orderId: order.id,
        amount: order.amount,
        status: order.status,
        newBalance,
      };
    },
  );
}
