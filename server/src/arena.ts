import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';
import { applyHouseEdge } from './houseEdge.js';
import { getProfile, addBalance, tryDeductBalance } from './supabaseStore.js';

/**
 * «Арена» — общий джекпот-раунд:
 *  - игроки ставят звёзды в окне ставок; поле делится пропорционально ставкам;
 *  - шарик останавливается в случайной точке — владелец сектора забирает банк
 *    (за вычетом комиссии дома, applyHouseEdge).
 *
 * Раунд живёт в памяти процесса (один инстанс на Railway): деньги при этом
 * всегда проходят через баланс-стор — списание при ставке, зачисление при
 * победе, так что состояние баланса консистентно. Переходы фаз считаются
 * лениво в tick() при каждом запросе — отдельный таймер не нужен, а polling
 * клиентов (~1 раз/сек) двигает раунд вовремя.
 */

const ALLOWED_BETS = [5, 10, 25, 50, 100] as const;
const MAX_PLAYERS = 8;
const MAX_TOTAL_BET_PER_PLAYER = 500;

const BETTING_WINDOW_MS = 20_000;
/** Продлеваем окно, если новый игрок вошёл под самый конец */
const MIN_WINDOW_AFTER_JOIN_MS = 8_000;
const MAX_BETTING_WINDOW_MS = 45_000;
const SPIN_MS = 4_500;
const RESULT_SHOW_MS = 6_000;

const BOT_ID = -1;
const BOT_NAME = '🤖 Бот';

const PLAYER_COLORS = [
  '#5eaee6', '#ff9f43', '#2ecc71', '#e74c3c',
  '#a78bfa', '#f6c945', '#4dd0c4', '#ff7ab8',
] as const;

interface ArenaPlayer {
  userId: number;
  name: string;
  bet: number;
  color: string;
  isBot: boolean;
}

interface ArenaRound {
  id: string;
  phase: 'betting' | 'spinning' | 'finished';
  players: ArenaPlayer[];
  createdAt: number;
  bettingEndsAt: number;
  spinEndsAt: number;
  finishedAt: number;
  winnerId: number | null;
  /** Угол остановки шарика: градусы по часовой от «12 часов» */
  winnerAngleDeg: number | null;
  payout: number;
  settled: boolean;
}

let currentRound: ArenaRound | null = null;

function pot(round: ArenaRound): number {
  return round.players.reduce((s, p) => s + p.bet, 0);
}

function newRound(now: number): ArenaRound {
  return {
    id: crypto.randomUUID(),
    phase: 'betting',
    players: [],
    createdAt: now,
    bettingEndsAt: now + BETTING_WINDOW_MS,
    spinEndsAt: 0,
    finishedAt: 0,
    winnerId: null,
    winnerAngleDeg: null,
    payout: 0,
    settled: false,
  };
}

/** Сектора по кругу в порядке входа игроков, старт от «12 часов» по часовой. */
function segments(round: ArenaRound): Array<{ userId: number; startDeg: number; endDeg: number }> {
  const total = pot(round);
  const out: Array<{ userId: number; startDeg: number; endDeg: number }> = [];
  if (total <= 0) return out;
  let acc = 0;
  for (const p of round.players) {
    const start = (acc / total) * 360;
    acc += p.bet;
    const end = (acc / total) * 360;
    out.push({ userId: p.userId, startDeg: start, endDeg: end });
  }
  return out;
}

/** Честный выбор победителя: вес = ставка (взвешенно по целым звёздам). */
function pickWinner(round: ArenaRound): ArenaPlayer {
  const total = pot(round);
  let r = crypto.randomInt(0, total);
  for (const p of round.players) {
    if (r < p.bet) return p;
    r -= p.bet;
  }
  return round.players[round.players.length - 1];
}

function angleInsideSegment(round: ArenaRound, userId: number): number {
  const seg = segments(round).find((s) => s.userId === userId);
  if (!seg) return 0;
  const span = seg.endDeg - seg.startDeg;
  // Отступ от границ, чтобы шарик визуально не лёг на стык секторов
  const pad = Math.min(4, span * 0.15);
  const usable = Math.max(span - pad * 2, 0.1);
  const r = crypto.randomInt(0, 10_000) / 10_000;
  return seg.startDeg + pad + usable * r;
}

function makeBot(round: ArenaRound): ArenaPlayer {
  const base = Math.max(5, Math.round(pot(round) * (0.5 + crypto.randomInt(0, 60) / 100)));
  const bet = Math.min(200, base);
  return {
    userId: BOT_ID,
    name: BOT_NAME,
    bet,
    color: PLAYER_COLORS[round.players.length % PLAYER_COLORS.length],
    isBot: true,
  };
}

/** Ленивые переходы фаз; вызывается на каждом запросе. */
async function tick(now = Date.now()): Promise<void> {
  const round = currentRound;
  if (!round) return;

  if (round.phase === 'betting' && round.players.length > 0 && now >= round.bettingEndsAt) {
    if (round.players.length === 1) {
      round.players.push(makeBot(round));
    }
    const winner = pickWinner(round);
    round.winnerId = winner.userId;
    round.winnerAngleDeg = angleInsideSegment(round, winner.userId);
    round.phase = 'spinning';
    round.spinEndsAt = now + SPIN_MS;
  }

  if (round.phase === 'spinning' && now >= round.spinEndsAt) {
    round.phase = 'finished';
    round.finishedAt = now;
  }

  if (round.phase === 'finished' && !round.settled) {
    round.settled = true;
    round.payout = applyHouseEdge(pot(round));
    const winner = round.players.find((p) => p.userId === round.winnerId);
    if (winner && !winner.isBot && round.payout > 0) {
      await addBalance(winner.userId, round.payout);
    }
  }

  if (round.phase === 'finished' && now >= round.finishedAt + RESULT_SHOW_MS) {
    currentRound = null;
  }
}

function roundView(round: ArenaRound | null, userId: number) {
  if (!round) return null;
  const total = pot(round);
  const segs = segments(round);
  const winner = round.players.find((p) => p.userId === round.winnerId) ?? null;
  return {
    roundId: round.id,
    phase: round.phase,
    pot: total,
    bettingEndsAt: round.bettingEndsAt,
    spinEndsAt: round.spinEndsAt,
    players: round.players.map((p) => {
      const seg = segs.find((s) => s.userId === p.userId);
      return {
        userId: p.userId,
        name: p.name,
        bet: p.bet,
        color: p.color,
        share: total > 0 ? p.bet / total : 0,
        startDeg: seg?.startDeg ?? 0,
        endDeg: seg?.endDeg ?? 0,
        isBot: p.isBot,
        isMe: p.userId === userId,
      };
    }),
    myBet: round.players.find((p) => p.userId === userId)?.bet ?? 0,
    // Угол отдаём только когда прокрут уже начался — до этого исход не раскрываем
    winnerAngleDeg: round.phase === 'betting' ? null : round.winnerAngleDeg,
    winner:
      round.phase === 'finished' && winner
        ? { userId: winner.userId, name: winner.name, color: winner.color, isMe: winner.userId === userId }
        : null,
    payout: round.phase === 'finished' ? round.payout : 0,
  };
}

export function registerArenaRoutes(
  app: FastifyInstance,
  deps: {
    getUserId: (req: FastifyRequest) => Promise<number>;
    getBalance: (userId: number) => Promise<number>;
  },
) {
  const { getUserId, getBalance } = deps;

  function jsonError(reply: FastifyReply, statusCode: number, message: string) {
    return reply.status(statusCode).send({ message });
  }

  app.get('/api/arena/state', async (req) => {
    const userId = await getUserId(req);
    await tick();
    return {
      round: roundView(currentRound, userId),
      balance: await getBalance(userId),
      now: Date.now(),
    };
  });

  app.post<{ Body: { bet?: number } }>(
    '/api/arena/bet',
    {
      schema: {
        body: {
          type: 'object',
          required: ['bet'],
          properties: { bet: { type: 'number' } },
        },
      },
    },
    async (req, reply) => {
      const userId = await getUserId(req);
      const now = Date.now();
      await tick(now);

      try {
        const bet = Number(req.body?.bet);
        if (!ALLOWED_BETS.includes(bet as (typeof ALLOWED_BETS)[number])) {
          return jsonError(reply, 400, 'Некорректная ставка');
        }

        if (currentRound && currentRound.phase !== 'betting') {
          return jsonError(reply, 400, 'Раунд уже идёт — дождитесь следующего');
        }
        if (!currentRound) {
          currentRound = newRound(now);
        }
        const round = currentRound;

        const existing = round.players.find((p) => p.userId === userId);
        if (!existing && round.players.length >= MAX_PLAYERS) {
          return jsonError(reply, 400, 'Арена заполнена — дождитесь следующего раунда');
        }
        if (existing && existing.bet + bet > MAX_TOTAL_BET_PER_PLAYER) {
          return jsonError(reply, 400, `Максимум ${MAX_TOTAL_BET_PER_PLAYER} звёзд на раунд`);
        }

        // Атомарное списание — при нехватке средств вернёт null
        const newBalance = await tryDeductBalance(userId, bet);
        if (newBalance === null) {
          return jsonError(reply, 400, 'Недостаточно звёзд');
        }

        if (existing) {
          existing.bet += bet;
        } else {
          const profile = await getProfile(userId).catch(() => null);
          round.players.push({
            userId,
            name: profile?.name || `Игрок #${userId}`,
            bet,
            color: PLAYER_COLORS[round.players.length % PLAYER_COLORS.length],
            isBot: false,
          });
          // Новому участнику оставляем время увидеть раунд
          const minEnd = now + MIN_WINDOW_AFTER_JOIN_MS;
          const maxEnd = round.createdAt + MAX_BETTING_WINDOW_MS;
          if (round.bettingEndsAt < minEnd) {
            round.bettingEndsAt = Math.min(minEnd, maxEnd);
          }
        }

        return {
          round: roundView(round, userId),
          balance: newBalance,
          now: Date.now(),
        };
      } catch (err) {
        req.log.error(err);
        const msg = err instanceof Error ? err.message : String(err);
        return jsonError(reply, 500, msg || 'Ошибка ставки');
      }
    },
  );
}
