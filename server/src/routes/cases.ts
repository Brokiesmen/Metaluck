import type { FastifyInstance } from 'fastify';
import { PRIZES, PRIZES_CASE1, PRIZES_CASE2, PRIZES_CASE3, CASES, FREE_CASE_INTERVAL_MS } from '../data.js';
import { HOUSE_EDGE, applyHouseEdgeStars } from '../houseEdge.js';
import { pickPrize, randomUnit } from '../random.js';
import { quietAwardXp, quietTryTasks } from '../progressAwards.js';
import { XP, TASK_IDS } from '../xp.js';
import {
  addHistory,
  getHistoryPage,
  getLastFreeCaseAt,
  getLeadersPage,
  setLastFreeCaseAt,
  claimDailyLoginXp,
} from '../supabaseStore.js';
import type { GetUserId } from './helpers.js';
import {
  CompleteTransaction,
  CreditBalance,
  CreditWinnings,
  GetPlayableBalance,
  isPayCurrency,
  ReleaseFunds,
  ReserveFunds,
} from '../payments/wallet/game.js';

interface OpenBody {
  caseId: number;
  currency?: string;
}

export function registerCaseRoutes(app: FastifyInstance, deps: { getUserId: GetUserId }) {
  const { getUserId } = deps;

  app.get('/api/balance', async (req) => {
    const userId = await getUserId(req);
    return { balance: await GetPlayableBalance(userId) };
  });

  app.get('/api/progress', async (req) => {
    const userId = await getUserId(req);
    // Daily login XP (once per UTC day) when cabinet/progress is opened
    return claimDailyLoginXp(userId, XP.DAILY_LOGIN);
  });

  app.get('/api/prizes', async () => ({
    prizes: PRIZES.map(({ weight: _w, ...p }) => p),
  }));

  app.get('/api/cases', async (req) => {
    const userId = await getUserId(req);
    const now = Date.now();
    const lastFree = await getLastFreeCaseAt(userId);
    const freeAvailable = now - lastFree >= FREE_CASE_INTERVAL_MS;
    const nextFreeAt = freeAvailable ? null : lastFree + FREE_CASE_INTERVAL_MS;

    return {
      cases: CASES.map((c) => ({
        ...c,
        ...(c.isFree ? { freeAvailable, nextFreeAt } : {}),
      })),
    };
  });

  app.get<{ Querystring: { page?: string; limit?: string } }>('/api/history', async (req) => {
    const userId = await getUserId(req);
    const page = Math.max(0, parseInt(req.query.page ?? '0', 10) || 0);
    const limit = Math.min(50, Math.max(5, parseInt(req.query.limit ?? '20', 10) || 20));
    const offset = page * limit;

    const { total, rows } = await getHistoryPage(userId, limit, offset);

    return {
      history: rows,
      pagination: { page, limit, total, hasMore: offset + limit < total },
    };
  });

  app.get<{ Querystring: { page?: string; limit?: string } }>('/api/leaders', async (req) => {
    const page = Math.max(0, parseInt(req.query.page ?? '0', 10) || 0);
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit ?? '50', 10) || 50));
    const offset = page * limit;

    const { total, leaders } = await getLeadersPage(limit, offset);

    return {
      leaders,
      pagination: { page, limit, total, hasMore: offset + limit < total },
    };
  });

  app.post<{ Body: OpenBody }>(
    '/api/case/open',
    {
      schema: {
        body: {
          type: 'object',
          required: ['caseId'],
          properties: {
            caseId: { type: 'number' },
            currency: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const userId = await getUserId(req);
      const { caseId } = req.body;
      const currency = req.body.currency ?? 'STARS';
      if (!isPayCurrency(currency)) {
        return reply.status(400).send({ message: 'Некорректная валюта' });
      }
      const gameCase = CASES.find((c) => c.id === caseId);
      if (!gameCase) return reply.status(404).send({ message: 'Кейс не найден' });

      const now = Date.now();
      const isFreeCaseLocked = Boolean(
        gameCase.isFree && now - (await getLastFreeCaseAt(userId)) < FREE_CASE_INTERVAL_MS,
      );
      if (isFreeCaseLocked) {
        return reply.status(400).send({ message: 'Ежедневный кейс можно открыть только раз в 24 часа' });
      }

      const cost = gameCase.price;

      let reservationId: string | null = null;
      if (cost > 0) {
        const reservation = await ReserveFunds(userId, cost, {
          game: 'cases',
          refId: `${caseId}:${now}`,
          payCurrency: currency,
        });
        if (!reservation) return reply.status(400).send({ message: 'Недостаточно средств' });
        reservationId = reservation.reservationId;
      }

      try {
      const pool = caseId === 3 ? PRIZES_CASE3 : caseId === 2 ? PRIZES_CASE2 : PRIZES_CASE1;
      let prize = pickPrize(pool);

      // House edge: крупные призы (gold / premium / 500+★) чаще перекидываем на мелкие
      const isBig =
        Boolean(prize.isPremium) ||
        prize.rarity === 'gold' ||
        (typeof prize.stars === 'number' && prize.stars >= 500);
      const isMid =
        prize.rarity === 'purple' ||
        (typeof prize.stars === 'number' && prize.stars >= 100 && prize.stars < 500);
      const rerollChance = isBig ? 0.62 : isMid ? 0.38 : !prize.stars ? HOUSE_EDGE : 0;

      if (randomUnit() < rerollChance) {
        if (caseId === 3) {
          // В элитном кейсе нет gray/stars — даунгрейдим Legendary → Epic
          const epicOnly = pool.filter((p) => p.rarity === 'purple' && !p.isPremium);
          if (epicOnly.length > 0 && (prize.rarity === 'gold' || prize.isPremium)) {
            prize = pickPrize(epicOnly);
          }
        } else {
          const cheap = pool.filter(
            (p) =>
              p.rarity === 'gray' ||
              p.rarity === 'blue' ||
              (typeof p.stars === 'number' && p.stars <= 50),
          );
          if (cheap.length > 0) prize = pickPrize(cheap);
        }
      }

      let newBalance: number;
      if (prize.stars) {
        const credited = applyHouseEdgeStars(prize.stars);
        newBalance = reservationId
          ? (await CreditBalance(reservationId, credited)).balance
          : (await CreditWinnings(userId, credited, {
              game: 'cases',
              refId: `${caseId}:${now}`,
            })).balance;
        prize = { ...prize, stars: credited, name: `${credited} звёзд` };
      } else if (reservationId) {
        newBalance = (await CompleteTransaction(reservationId)).balance;
      } else {
        newBalance = await GetPlayableBalance(userId, cost > 0 ? currency : 'STARS');
      }
      if (gameCase.isFree) {
        await setLastFreeCaseAt(userId, now);
      }

      if (!prize.stars) {
        await addHistory(userId, { caseId, caseName: gameCase.name, prize, timestamp: now });
      }

      const xpAmount = gameCase.isFree ? XP.FREE_CASE : XP.CASE_OPEN(cost);
      await quietAwardXp(userId, xpAmount);
      const caseTasks: string[] = [TASK_IDS.OPEN_CASE];
      if (!gameCase.isFree && cost > 0) caseTasks.push(TASK_IDS.OPEN_PAID_CASE);
      await quietTryTasks(userId, caseTasks);

      return { prize, newBalance };
      } catch (err) {
        if (reservationId) {
          await ReleaseFunds(reservationId).catch(() => undefined);
        }
        throw err;
      }
    },
  );
}
