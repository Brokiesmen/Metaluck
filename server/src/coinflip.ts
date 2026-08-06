import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';
import { applyHouseEdge } from './houseEdge.js';
import { onGamePlayXp, onGameWinXp } from './progressAwards.js';
import { XP } from './xp.js';
import {
  CompleteTransaction,
  CreditBalance,
  isPayCurrency,
  ReleaseFunds,
  ReserveFunds,
} from './payments/wallet/game.js';

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
 * Balance only via Wallet: ReserveFunds → CreditBalance | CompleteTransaction.
 * Currency is resolved inside Wallet — this module never touches STARS/TON/USDT.
 */
export function registerCoinflipRoutes(
  app: FastifyInstance,
  deps: {
    getUserId: (req: FastifyRequest) => Promise<number>;
  },
) {
  const { getUserId } = deps;

  function jsonError(reply: FastifyReply, statusCode: number, message: string) {
    return reply.status(statusCode).send({ message });
  }

  app.post<{ Body: { bet?: number; choice?: string; currency?: string } }>(
    '/api/coinflip/play',
    {
      schema: {
        body: {
          type: 'object',
          required: ['bet', 'choice'],
          properties: {
            bet: { type: 'number' },
            choice: { type: 'string', enum: ['heads', 'tails'] },
            currency: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const userId = await getUserId(req);
      try {
        const bet = Number(req.body?.bet);
        const choice = req.body?.choice;
        const currency = req.body?.currency ?? 'STARS';
        if (!ALLOWED_BETS.includes(bet as (typeof ALLOWED_BETS)[number])) {
          return jsonError(reply, 400, 'Некорректная ставка');
        }
        if (!isSide(choice)) {
          return jsonError(reply, 400, 'Выберите орёл или решку');
        }
        if (!isPayCurrency(currency)) {
          return jsonError(reply, 400, 'Некорректная валюта');
        }

        const reservation = await ReserveFunds(userId, bet, {
          game: 'coinflip',
          refId: crypto.randomUUID(),
          payCurrency: currency,
        });
        if (!reservation) {
          return jsonError(reply, 400, 'Недостаточно средств');
        }

        try {
          const result: Side = SIDES[crypto.randomInt(0, 2)];
          const win = result === choice;
          const payout = win ? payoutForWin(bet) : 0;

          const settled = win
            ? await CreditBalance(reservation.reservationId, payout)
            : await CompleteTransaction(reservation.reservationId);

          await onGamePlayXp(userId, 'coinflip');
          if (win) await onGameWinXp(userId, XP.COINFLIP_WIN, 'coinflip');

          return { newBalance: settled.balance, bet, choice, result, win, payout };
        } catch (settleErr) {
          await ReleaseFunds(reservation.reservationId).catch(() => undefined);
          throw settleErr;
        }
      } catch (err) {
        req.log.error(err);
        const msg = err instanceof Error ? err.message : String(err);
        return jsonError(reply, 500, msg || 'Ошибка игры');
      }
    },
  );
}
