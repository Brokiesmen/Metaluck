import type { FastifyInstance } from 'fastify';
import { PRIZES } from '../data.js';
import { quietAwardXp } from '../progressAwards.js';
import { XP } from '../xp.js';
import type { Prize } from '../types.js';
import {
  WHEEL_CASE_ID,
  WHEEL_CASE_NAME,
  WHEEL_INTERVAL_MS,
  WHEEL_SEGMENTS,
  PREMIUM_WHEEL_CASE_ID,
  PREMIUM_WHEEL_CASE_NAME,
  PREMIUM_WHEEL_PACKAGE_ID,
  PREMIUM_WHEEL_XTR,
  PREMIUM_WHEEL_SEGMENTS,
  COUPON_LEDGER_CASE_ID,
  COUPON_LEDGER_CASE_NAME,
  pickWheelSegment,
  pickPremiumWheelSegment,
  segmentToPrizeBase,
  type WheelSegment,
} from '../wheel.js';
import {
  addCouponsLedger,
  addHistory,
  getCoupons,
  getLastWheelAt,
  getTopupOrderMeta,
  setTopupOrderMeta,
  trySpendCoupon,
} from '../supabaseStore.js';
import type { GetUserId, HistoryEntry } from './helpers.js';
import { createPremiumWheelDeposit } from '../payments/deposit/index.js';
import { CreditWinnings, GetPlayableBalance } from '../payments/wallet/game.js';

function giftPoolForRarity(rarity: string): Prize[] {
  let giftPool = PRIZES.filter((p) => !p.stars && !p.isPremium && p.rarity === rarity);
  if (giftPool.length === 0) {
    giftPool = PRIZES.filter((p) => !p.stars && !p.isPremium);
  }
  return giftPool;
}

async function applyWheelOutcome(
  userId: number,
  segment: WheelSegment,
  caseId: number,
  caseName: string,
  now: number,
): Promise<{
  prize: Prize;
  newBalance: number;
  coupons: number;
  segmentIndex: number;
  empty: boolean;
}> {
  const built = segmentToPrizeBase(segment, giftPoolForRarity('gold'));
  let newBalance = await GetPlayableBalance(userId);

  if (built.prize.stars && built.prize.stars > 0) {
    newBalance = (
      await CreditWinnings(userId, built.prize.stars, {
        game: 'wheel',
        refId: `${caseId}:${now}`,
      })
    ).balance;
  }

  let coupons = await getCoupons(userId);
  if (built.couponsDelta > 0) {
    coupons = await addCouponsLedger(
      userId,
      built.couponsDelta,
      COUPON_LEDGER_CASE_ID,
      COUPON_LEDGER_CASE_NAME,
    );
  }

  await addHistory(userId, {
    caseId,
    caseName,
    prize: built.prize,
    timestamp: now,
  } satisfies HistoryEntry);

  if (!built.prize.stars) {
    newBalance = await GetPlayableBalance(userId);
  }

  return {
    prize: built.prize,
    newBalance,
    coupons,
    segmentIndex: built.segmentIndex,
    empty: built.empty,
  };
}

export function registerWheelRoutes(app: FastifyInstance, deps: { getUserId: GetUserId }) {
  const { getUserId } = deps;

  app.get('/api/wheel/status', async (req) => {
    const userId = await getUserId(req);
    const now = Date.now();
    const lastAt = await getLastWheelAt(userId, WHEEL_CASE_ID);
    const available = now - lastAt >= WHEEL_INTERVAL_MS;
    const coupons = await getCoupons(userId);
    return {
      available,
      nextAt: available ? null : lastAt + WHEEL_INTERVAL_MS,
      coupons,
      segments: WHEEL_SEGMENTS.map(({ id, label, color }) => ({ id, label, color })),
      premiumSegments: PREMIUM_WHEEL_SEGMENTS.map(({ id, label, color }) => ({ id, label, color })),
      premiumXtr: PREMIUM_WHEEL_XTR,
    };
  });

  app.post('/api/wheel/spin', { schema: { body: { type: 'object' } } }, async (req, reply) => {
    const userId = await getUserId(req);
    const now = Date.now();
    const lastAt = await getLastWheelAt(userId, WHEEL_CASE_ID);
    if (now - lastAt < WHEEL_INTERVAL_MS) {
      return reply.status(400).send({
        message: 'Колесо будет доступно позже',
        nextAt: lastAt + WHEEL_INTERVAL_MS,
      });
    }

    const segment = pickWheelSegment();
    const result = await applyWheelOutcome(userId, segment, WHEEL_CASE_ID, WHEEL_CASE_NAME, now);
    await quietAwardXp(userId, XP.WHEEL_SPIN);

    return {
      ...result,
      nextAt: now + WHEEL_INTERVAL_MS,
    };
  });

  app.post<{ Body: { method?: string; payload?: string } }>(
    '/api/wheel/premium/spin',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            method: { type: 'string' },
            payload: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const userId = await getUserId(req);
      const method = String(req.body?.method ?? '');
      const now = Date.now();

      if (method === 'coupon') {
        const spent = await trySpendCoupon(userId, COUPON_LEDGER_CASE_ID, COUPON_LEDGER_CASE_NAME);
        if (spent === null) {
          return reply.status(400).send({ message: 'Недостаточно купонов' });
        }
      } else if (method === 'xtr') {
        const payload = String(req.body?.payload ?? '');
        if (!payload) {
          return reply.status(400).send({ message: 'Нет платежа' });
        }
        const order = await getTopupOrderMeta(payload, userId);
        if (!order || order.status !== 'paid' || order.package_id !== PREMIUM_WHEEL_PACKAGE_ID) {
          return reply.status(400).send({ message: 'Оплата не найдена' });
        }
        if (order.meta !== 'premium_spin_credit') {
          return reply.status(400).send({ message: 'Это вращение уже использовано' });
        }
        await setTopupOrderMeta(payload, 'premium_spin_used');
      } else {
        return reply.status(400).send({ message: 'Укажите method: coupon или xtr' });
      }

      const segment = pickPremiumWheelSegment();
      const result = await applyWheelOutcome(
        userId,
        segment,
        PREMIUM_WHEEL_CASE_ID,
        PREMIUM_WHEEL_CASE_NAME,
        now,
      );
      await quietAwardXp(userId, XP.WHEEL_SPIN);

      return result;
    },
  );

  app.post('/api/wheel/premium/create-invoice', { schema: { body: { type: 'object' } } }, async (req, reply) => {
    const userId = await getUserId(req);
    if (userId <= 0) {
      return reply.status(400).send({ message: 'Оплата доступна только внутри Telegram Mini App.' });
    }

    try {
      const view = await createPremiumWheelDeposit(userId);
      return {
        invoiceLink: view.invoiceLink,
        payload: view.id,
        xtrAmount: PREMIUM_WHEEL_XTR,
      };
    } catch {
      return reply.status(500).send({ message: 'Не удалось создать счёт. Попробуйте ещё раз.' });
    }
  });

  app.get<{ Params: { payload: string } }>('/api/wheel/premium/status/:payload', async (req, reply) => {
    const userId = await getUserId(req);
    const order = await getTopupOrderMeta(req.params.payload, userId);
    if (!order) {
      return reply.status(404).send({ message: 'Платёж не найден' });
    }
    return {
      status: order.status,
      readyToSpin: order.status === 'paid' && order.meta === 'premium_spin_credit',
      used: order.meta === 'premium_spin_used',
    };
  });
}
