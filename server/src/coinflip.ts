import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';
import { applyHouseEdge } from './houseEdge.js';
import { onGamePlayXp, onGameWinXp } from './progressAwards.js';
import { XP } from './xp.js';

const ALLOWED_BETS = [5, 10, 25, 50, 100] as const;
const SIDES = ['heads', 'tails'] as const;
type Side = (typeof SIDES)[number];

function isSide(v: unknown): v is Side {
  return v === 'heads' || v === 'tails';
}

/** Fair 2× payout, then −25% house edge → 1.5× stake on win. */
function payoutForWin(bet: number): number {
  return applyHouseEdge(bet * 2);
}

/**
 * Игра одноходовая и не хранит состояние между запросами — баланс
 * списывается и зачисляется атомарно в рамках одного запроса, поэтому
 * отдельная таблица в БД (как у blackjack) не нужна.
 */
export function registerCoinflipRoutes(
  app: FastifyInstance,
  deps: {
    getUserId: (req: FastifyRequest) => Promise<number>;
    getBalance: (userId: number) => Promise<number>;
    tryDeductBalance: (userId: number, amount: number) => Promise<number | null>;
    addBalance: (userId: number, delta: number) => Promise<number>;
  },
) {
  const { getUserId, tryDeductBalance, addBalance } = deps;

  function jsonError(reply: FastifyReply, statusCode: number, message: string) {
    return reply.status(statusCode).send({ message });
  }

  app.post<{ Body: { bet?: number; choice?: string } }>(
    '/api/coinflip/play',
    {
      schema: {
        body: {
          type: 'object',
          required: ['bet', 'choice'],
          properties: {
            bet: { type: 'number' },
            choice: { type: 'string', enum: ['heads', 'tails'] },
          },
        },
      },
    },
    async (req, reply) => {
      const userId = await getUserId(req);
      try {
        const bet = Number(req.body?.bet);
        const choice = req.body?.choice;
        if (!ALLOWED_BETS.includes(bet as (typeof ALLOWED_BETS)[number])) {
          return jsonError(reply, 400, 'Некорректная ставка');
        }
        if (!isSide(choice)) {
          return jsonError(reply, 400, 'Выберите орёл или решку');
        }

        const afterBet = await tryDeductBalance(userId, bet);
        if (afterBet === null) {
          return jsonError(reply, 400, 'Недостаточно звёзд');
        }

        const result: Side = SIDES[crypto.randomInt(0, 2)];
        const win = result === choice;
        const payout = win ? payoutForWin(bet) : 0;

        const newBalance = payout > 0 ? await addBalance(userId, payout) : afterBet;

        await onGamePlayXp(userId, 'coinflip');
        if (win) await onGameWinXp(userId, XP.COINFLIP_WIN, 'coinflip');

        return { newBalance, bet, choice, result, win, payout };
      } catch (err) {
        req.log.error(err);
        const msg = err instanceof Error ? err.message : String(err);
        return jsonError(reply, 500, msg || 'Ошибка игры');
      }
    },
  );
}
