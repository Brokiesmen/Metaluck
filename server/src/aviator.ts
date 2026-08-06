import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';
import {
  ALLOWED_BETS,
  MAX_TOTAL_BET_PER_PLAYER,
  MIN_CASHOUT,
  MAX_CRASH,
  isAllowedBet,
  multiplierAt,
  timeToReachMs,
  generateCrashPoint,
  payoutForCashout,
  normalizeAutoCashout,
} from './aviatorEngine.js';
import {
  getProfile,
  addBalance,
  tryDeductBalance,
  addHistory,
  getBotChatId,
} from './supabaseStore.js';
import { onGamePlayXp, onGameWinXp } from './progressAwards.js';
import { XP } from './xp.js';
import { telegramJsonMethod, miniAppUrl } from './routes/helpers.js';
import type { Rarity } from './types.js';

/**
 * «Aviator» — общий crash-раунд для всех игроков (паттерн arena.ts):
 *  betting → flying → crashed → betting …
 *
 *  - раунд живёт в памяти процесса (один инстанс), но деньги ВСЕГДА проходят
 *    через баланс-стор: списание при ставке (tryDeductBalance), зачисление при
 *    кэшауте (addBalance). Поэтому баланс консистентен даже при рестарте (в
 *    полёте потерянные ставки уже списаны — это корректный проигрыш).
 *  - множитель растёт по детерминированной кривой (aviatorEngine); клиент рисует
 *    его локально от серверного времени, а сервер — единственный авторитет по
 *    точке краша и факту кэшаута. crashMultiplier НЕ раскрывается до фазы crashed.
 *  - переходы фаз двигает driver-loop (setInterval) для плавного WS-вещания и
 *    лениво — tick() на каждом HTTP-запросе (REST-fallback без сокетов).
 *
 * Все вычисления (множитель, краш, авто-кэшаут, выплаты) — только на сервере.
 */

/** Записи о выигрышах в общей таблице histories (как у колеса фортуны). */
const AVIATOR_CASE_ID = 9020;
const AVIATOR_CASE_NAME = 'Авиатор';
/** От какой выплаты шлём игроку личное сообщение в Telegram. */
const BIG_WIN_NOTIFY_MIN = 200;

const BETTING_WINDOW_MS = 6_000;
const CRASHED_SHOW_MS = 3_500;
/** Частота тика игрового цикла: определяет точность момента краша. */
const LOOP_INTERVAL_MS = 200;
/** Сколько последних крашей отдаём в истории. */
const HISTORY_LEN = 20;

const PLAYER_COLORS = [
  '#5eaee6', '#ff9f43', '#2ecc71', '#e74c3c',
  '#a78bfa', '#f6c945', '#4dd0c4', '#ff7ab8',
] as const;

const BOT_NAMES = [
  'ShadowFox', 'NeonWolf', 'StarHunter', 'LuckyAce', 'FrostBite', 'NightOwl',
  'GoldRush', 'ViperX', 'CosmoKid', 'BlazeRun', 'SilkShot', 'ZeroGravity',
  'PixelKing', 'IronPulse', 'NovaSpin', 'QuickDraw', 'MoonJack', 'CrystalBet',
] as const;

interface AviatorBet {
  userId: number;
  name: string;
  bet: number;
  color: string;
  isBot: boolean;
  /** Целевой авто-кэшаут или null (ручной). */
  autoCashout: number | null;
  /** Множитель, на котором игрок забрал, либо null (ещё в игре / проиграл). */
  cashedOutMult: number | null;
  /** Выплата за кэшаут (0, пока не забрал). */
  payout: number;
}

interface AviatorRound {
  id: string;
  phase: 'betting' | 'flying' | 'crashed';
  bets: AviatorBet[];
  createdAt: number;
  bettingEndsAt: number;
  /** Момент старта полёта (wall-clock). */
  startedAt: number;
  /** Скрытая точка краша (не отдаётся до phase === 'crashed'). */
  crashMult: number;
  /** Момент краша (wall-clock) = startedAt + timeToReach(crashMult). */
  crashAtWall: number;
  crashedAt: number;
  nextRoundAt: number;
}

let currentRound: AviatorRound | null = null;
/** Кольцо последних крашей (свежие — в конце). */
const crashHistory: number[] = [];

// ── WebSocket-реестр ────────────────────────────────────────────────────────
type WsLike = { send: (data: string) => void; readyState?: number };
const sockets = new Set<WsLike>();

function broadcast(type: string, data: unknown): void {
  if (sockets.size === 0) return;
  const msg = JSON.stringify({ type, data, now: Date.now() });
  for (const ws of sockets) {
    try {
      ws.send(msg);
    } catch {
      sockets.delete(ws);
    }
  }
}

// ── Хелперы раунда ──────────────────────────────────────────────────────────

function newRound(now: number): AviatorRound {
  const round: AviatorRound = {
    id: crypto.randomUUID(),
    phase: 'betting',
    bets: [],
    createdAt: now,
    bettingEndsAt: now + BETTING_WINDOW_MS,
    startedAt: 0,
    crashMult: 0,
    crashAtWall: 0,
    crashedAt: 0,
    nextRoundAt: 0,
  };
  seedBots(round);
  return round;
}

function pickBotName(round: AviatorRound): string {
  const used = new Set(round.bets.map((b) => b.name));
  const free = BOT_NAMES.filter((n) => !used.has(n));
  const pool = free.length > 0 ? free : [...BOT_NAMES];
  return pool[crypto.randomInt(0, pool.length)];
}

/** Косметические боты, чтобы табло ставок не было пустым (баланс не трогают). */
function seedBots(round: AviatorRound): void {
  const count = 1 + crypto.randomInt(0, 3); // 1..3
  for (let i = 0; i < count; i++) {
    const bet = ALLOWED_BETS[crypto.randomInt(0, ALLOWED_BETS.length)];
    // Авто-кэшаут ботов: 1.2×..5.0×
    const auto = Math.floor((1.2 + (5.0 - 1.2) * (crypto.randomInt(0, 1000) / 1000)) * 100) / 100;
    round.bets.push({
      userId: -1 - i,
      name: pickBotName(round),
      bet,
      color: PLAYER_COLORS[round.bets.length % PLAYER_COLORS.length],
      isBot: true,
      autoCashout: auto,
      cashedOutMult: null,
      payout: 0,
    });
  }
}

/** Текущий множитель полёта, ограниченный точкой краша. */
function liveMultiplier(round: AviatorRound, now: number): number {
  if (round.phase === 'crashed') return round.crashMult;
  if (round.phase !== 'flying') return 1.0;
  const m = multiplierAt(now - round.startedAt);
  return Math.min(m, round.crashMult);
}

function rarityForPayout(payout: number): Rarity {
  if (payout >= 500) return 'gold';
  if (payout >= 100) return 'purple';
  if (payout >= 50) return 'blue';
  return 'gray';
}

/**
 * История выигрыша + личное уведомление в Telegram при крупной выплате.
 * Полностью best-effort: игровой поток не должен падать из-за БД или Telegram.
 */
function recordCashout(userId: number, bet: number, mult: number, payout: number): void {
  const now = Date.now();

  addHistory(userId, {
    caseId: AVIATOR_CASE_ID,
    caseName: `${AVIATOR_CASE_NAME} ×${mult.toFixed(2)}`,
    prize: {
      id: 9220,
      name: `${payout} ★`,
      rarity: rarityForPayout(payout),
      icon: '✈️',
      stars: payout,
    },
    timestamp: now,
  }).catch((err) => {
    console.error('[aviator] history write failed', userId, err);
  });

  if (payout < BIG_WIN_NOTIFY_MIN) return;

  void (async () => {
    try {
      const chatId = await getBotChatId(userId);
      if (!chatId) return;
      const url = miniAppUrl();
      await telegramJsonMethod('sendMessage', {
        chat_id: chatId,
        text:
          `✈️ <b>Авиатор</b> — вы забрали на <b>×${mult.toFixed(2)}</b>!\n` +
          `Ставка: ${bet} ★ → выигрыш: <b>${payout} ★</b>`,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...(url ? { reply_markup: { inline_keyboard: [[{ text: '🎮 Играть', url }]] } } : {}),
      });
    } catch (err) {
      console.warn('[aviator] win notify failed', userId, err);
    }
  })();
}

/**
 * Рассчитать кэшаут ставки (авто или ручной). Флаг выставляется СИНХРОННО до
 * await, поэтому повторные/конкурентные вызовы не могут выплатить дважды.
 * Для реальных игроков зачисляет баланс и XP; боты — косметика.
 * Если зачисление упало — откатываем флаг, чтобы игрок мог повторить cashout.
 */
async function settleCashout(bet: AviatorBet, mult: number): Promise<number> {
  if (bet.cashedOutMult !== null) return bet.payout; // уже забрал — идемпотентно
  const payout = payoutForCashout(bet.bet, mult);
  bet.cashedOutMult = mult;
  bet.payout = payout;
  if (!bet.isBot && payout > 0) {
    try {
      await addBalance(bet.userId, payout);
    } catch (err) {
      bet.cashedOutMult = null;
      bet.payout = 0;
      throw err;
    }
    await onGameWinXp(bet.userId, XP.AVIATOR_CASHOUT(mult), 'aviator');
    recordCashout(bet.userId, bet.bet, mult, payout);
  }
  broadcast('aviator:cashout', {
    roundId: currentRound?.id,
    userId: bet.userId,
    name: bet.name,
    mult,
    payout,
    isBot: bet.isBot,
  });
  return payout;
}

// ── Игровой цикл (сериализован: tick + bet + cashout в одной очереди) ────────

let queue: Promise<unknown> = Promise.resolve();

/** Все мутации раунда идут строго по очереди — иначе двойные ставки / кэшаут после краша. */
function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function tick(now = Date.now(), spawn = false): Promise<void> {
  return runExclusive(() => doTick(now, spawn));
}

async function doTick(now: number, spawn: boolean): Promise<void> {
  try {
    await doTickInner(now, spawn);
  } catch (err) {
    console.error('[aviator] tick error', err);
  }
}

async function doTickInner(now: number, spawn: boolean): Promise<void> {
  if (!currentRound) {
    if (spawn) {
      currentRound = newRound(now);
      broadcast('aviator:round', publicRound(currentRound, now, 0));
    }
    return;
  }
  const round = currentRound;

  // betting → flying
  if (round.phase === 'betting' && now >= round.bettingEndsAt) {
    round.phase = 'flying';
    round.startedAt = now;
    round.crashMult = generateCrashPoint();
    round.crashAtWall = now + timeToReachMs(round.crashMult);
    broadcast('aviator:round', publicRound(round, now, 0));
  }

  // flying: авто-кэшауты, затем проверка краша
  if (round.phase === 'flying') {
    const reached = liveMultiplier(round, now);
    for (const b of round.bets) {
      if (b.cashedOutMult === null && b.autoCashout !== null) {
        // Успевает только если цель строго ниже точки краша и уже достигнута.
        if (b.autoCashout < round.crashMult && b.autoCashout <= reached) {
          try {
            await settleCashout(b, b.autoCashout);
          } catch (err) {
            console.error('[aviator] auto cashout failed', b.userId, err);
          }
        }
      }
    }

    if (now >= round.crashAtWall) {
      // Финальный проход авто-кэшаутов для целей строго ниже краша (страховка от округления).
      for (const b of round.bets) {
        if (b.cashedOutMult === null && b.autoCashout !== null && b.autoCashout < round.crashMult) {
          try {
            await settleCashout(b, b.autoCashout);
          } catch (err) {
            console.error('[aviator] auto cashout failed', b.userId, err);
          }
        }
      }
      round.phase = 'crashed';
      round.crashedAt = now;
      round.nextRoundAt = now + CRASHED_SHOW_MS;
      crashHistory.push(round.crashMult);
      if (crashHistory.length > HISTORY_LEN) crashHistory.shift();
      broadcast('aviator:crash', { roundId: round.id, crashMult: round.crashMult });
      broadcast('aviator:round', publicRound(round, now, round.crashMult));
    }
  }

  // crashed → betting (или dormant, если никто не смотрит)
  if (round.phase === 'crashed' && now >= round.nextRoundAt) {
    if (spawn || sockets.size > 0) {
      currentRound = newRound(now);
      broadcast('aviator:round', publicRound(currentRound, now, 0));
    } else {
      currentRound = null;
    }
  }
}

// ── Представление раунда (crashMult скрыт до краша) ─────────────────────────

function publicBet(b: AviatorBet, userId: number) {
  return {
    userId: b.userId,
    name: b.name,
    bet: b.bet,
    color: b.color,
    isBot: b.isBot,
    autoCashout: b.autoCashout,
    cashedOutMult: b.cashedOutMult,
    payout: b.payout,
    isMe: b.userId === userId,
  };
}

function publicRound(round: AviatorRound | null, now: number, forUser: number) {
  if (!round) {
    return { round: null, config, history: [...crashHistory] };
  }
  const mine = round.bets.find((b) => b.userId === forUser && !b.isBot) ?? null;
  return {
    roundId: round.id,
    phase: round.phase,
    startedAt: round.phase === 'flying' ? round.startedAt : null,
    bettingEndsAt: round.phase === 'betting' ? round.bettingEndsAt : null,
    nextRoundAt: round.phase === 'crashed' ? round.nextRoundAt : null,
    multiplier: liveMultiplier(round, now),
    // Точку краша отдаём ТОЛЬКО когда самолёт уже разбился.
    crashMultiplier: round.phase === 'crashed' ? round.crashMult : null,
    players: round.bets.map((b) => publicBet(b, forUser)),
    myBet: mine?.bet ?? 0,
    myAutoCashout: mine?.autoCashout ?? null,
    myCashedOutMult: mine?.cashedOutMult ?? null,
    myPayout: mine?.payout ?? 0,
    history: [...crashHistory],
    config,
  };
}

const config = {
  allowedBets: ALLOWED_BETS,
  maxTotalBetPerPlayer: MAX_TOTAL_BET_PER_PLAYER,
  minCashout: MIN_CASHOUT,
  maxCrash: MAX_CRASH,
  bettingWindowMs: BETTING_WINDOW_MS,
} as const;

// ── Регистрация маршрутов + WS + driver-loop ───────────────────────────────

export async function registerAviatorRoutes(
  app: FastifyInstance,
  deps: {
    getUserId: (req: FastifyRequest) => Promise<number>;
    getBalance: (userId: number) => Promise<number>;
  },
): Promise<void> {
  const { getUserId, getBalance } = deps;

  function jsonError(reply: FastifyReply, statusCode: number, message: string) {
    return reply.status(statusCode).send({ message });
  }

  // ── GET /api/aviator/state — REST-снимок (fallback без сокета) ─────────────
  app.get('/api/aviator/state', async (req) => {
    const userId = await getUserId(req);
    await tick(Date.now(), true);
    const now = Date.now();
    return {
      round: currentRound ? publicRound(currentRound, now, userId) : null,
      balance: await getBalance(userId),
      config,
      history: [...crashHistory],
      now,
    };
  });

  // ── POST /api/aviator/bet — ставка в окне betting ─────────────────────────
  app.post<{ Body: { bet?: number; autoCashout?: number | null } }>(
    '/api/aviator/bet',
    {
      schema: {
        body: {
          type: 'object',
          required: ['bet'],
          properties: {
            bet: { type: 'number' },
            autoCashout: { type: ['number', 'null'] },
          },
        },
      },
    },
    async (req, reply) => {
      const userId = await getUserId(req);
      if (userId <= 0) {
        return jsonError(reply, 400, 'Ставки доступны только внутри Telegram Mini App.');
      }

      try {
        const bet = Number(req.body?.bet);
        if (!isAllowedBet(bet)) {
          return jsonError(reply, 400, 'Некорректная ставка');
        }
        const autoCashout = normalizeAutoCashout(req.body?.autoCashout);

        return await runExclusive(async () => {
          await doTick(Date.now(), true);

          const round = currentRound;
          if (!round || round.phase !== 'betting') {
            return jsonError(reply, 400, 'Ставки закрыты — дождитесь следующего раунда');
          }

          const existing = round.bets.find((b) => b.userId === userId && !b.isBot);
          if (existing && existing.bet + bet > MAX_TOTAL_BET_PER_PLAYER) {
            return jsonError(reply, 400, `Максимум ${MAX_TOTAL_BET_PER_PLAYER} звёзд на раунд`);
          }

          // Атомарное списание — при нехватке вернёт null.
          const newBalance = await tryDeductBalance(userId, bet);
          if (newBalance === null) {
            return jsonError(reply, 400, 'Недостаточно звёзд');
          }

          // После await фаза могла смениться только если кто-то обошёл очередь —
          // на всякий случай возвращаем деньги.
          if (!currentRound || currentRound.id !== round.id || currentRound.phase !== 'betting') {
            await addBalance(userId, bet);
            return jsonError(reply, 400, 'Ставки закрыты — дождитесь следующего раунда');
          }

          await onGamePlayXp(userId, 'aviator');

          if (existing) {
            existing.bet += bet;
            if (autoCashout !== null) existing.autoCashout = autoCashout;
          } else {
            // Повторный поиск: в очереди дублей быть не должно, но защищаемся.
            const again = round.bets.find((b) => b.userId === userId && !b.isBot);
            if (again) {
              again.bet += bet;
              if (autoCashout !== null) again.autoCashout = autoCashout;
            } else {
              const profile = await getProfile(userId).catch(() => null);
              round.bets.push({
                userId,
                name: profile?.name || `Игрок #${userId}`,
                bet,
                color: PLAYER_COLORS[round.bets.length % PLAYER_COLORS.length],
                isBot: false,
                autoCashout,
                cashedOutMult: null,
                payout: 0,
              });
            }
          }

          const bumped = round.bets.find((b) => b.userId === userId && !b.isBot)!;
          broadcast('aviator:bet', {
            roundId: round.id,
            userId,
            name: bumped.name,
            bet: bumped.bet,
            color: bumped.color,
            autoCashout: bumped.autoCashout,
          });

          const now = Date.now();
          return {
            round: publicRound(round, now, userId),
            balance: newBalance,
            now,
          };
        });
      } catch (err) {
        req.log.error(err);
        const msg = err instanceof Error ? err.message : String(err);
        return jsonError(reply, 500, msg || 'Ошибка ставки');
      }
    },
  );

  // ── POST /api/aviator/cashout — ручной забор в полёте ─────────────────────
  app.post<{ Body: { roundId?: string } }>(
    '/api/aviator/cashout',
    {
      schema: {
        body: {
          type: 'object',
          required: ['roundId'],
          properties: { roundId: { type: 'string' } },
        },
      },
    },
    async (req, reply) => {
      const userId = await getUserId(req);

      try {
        const roundId = String(req.body?.roundId ?? '');

        return await runExclusive(async () => {
          await doTick(Date.now(), true);

          const round = currentRound;
          if (!round || round.id !== roundId) {
            return jsonError(reply, 400, 'Раунд уже завершён');
          }
          if (round.phase !== 'flying') {
            return jsonError(reply, 400, 'Сейчас забрать нельзя');
          }

          const bet = round.bets.find((b) => b.userId === userId && !b.isBot);
          if (!bet) return jsonError(reply, 404, 'Ставка не найдена');

          if (bet.cashedOutMult !== null) {
            // Уже забрал — идемпотентно возвращаем прежний результат.
            const now = Date.now();
            return {
              round: publicRound(round, now, userId),
              balance: await getBalance(userId),
              payout: bet.payout,
              multiplier: bet.cashedOutMult,
              now,
            };
          }

          const now = Date.now();
          const mult = liveMultiplier(round, now);
          // Строго до точки краша: при equality самолёт уже «улетел».
          if (mult < MIN_CASHOUT || mult >= round.crashMult || now >= round.crashAtWall) {
            return jsonError(reply, 400, 'Опоздали — самолёт улетел');
          }

          const payout = await settleCashout(bet, mult);
          const after = Date.now();
          return {
            round: publicRound(round, after, userId),
            balance: await getBalance(userId),
            payout,
            multiplier: mult,
            now: after,
          };
        });
      } catch (err) {
        req.log.error(err);
        const msg = err instanceof Error ? err.message : String(err);
        return jsonError(reply, 500, msg || 'Ошибка кэшаута');
      }
    },
  );

  // ── WebSocket: /api/aviator/ws (только сервер → клиент) ────────────────────
  // Мутации (ставка/кэшаут) идут через REST (там уже есть авторизация по
  // initData). Сокет — широковещательная лента: round / tick / bet / cashout /
  // crash. Требует @fastify/websocket; если пакет не установлен — REST-поллинг
  // остаётся рабочим, а WS просто отключается.
  try {
    const websocket = await import('@fastify/websocket');
    await app.register(websocket.default ?? (websocket as unknown as typeof import('@fastify/websocket').default));

    app.get('/api/aviator/ws', { websocket: true } as never, (connection: any) => {
      const ws: WsLike = connection?.socket ?? connection;
      sockets.add(ws);
      // Начальный снимок (без персонализации — клиент сам сопоставит isMe по userId).
      try {
        ws.send(
          JSON.stringify({
            type: 'aviator:round',
            data: currentRound ? publicRound(currentRound, Date.now(), 0) : { round: null, config, history: [...crashHistory] },
            now: Date.now(),
          }),
        );
      } catch {
        /* ignore */
      }
      const raw = connection?.socket ?? connection;
      raw.on?.('close', () => sockets.delete(ws));
      raw.on?.('error', () => sockets.delete(ws));
      // Клиентские сообщения игнорируем (read-only канал); tick запускаем, чтобы
      // подключение сразу «оживило» игру.
      void tick(Date.now(), true);
    });

    app.log.info('[aviator] WebSocket enabled at /api/aviator/ws');
  } catch (err) {
    app.log.warn(
      { err: err instanceof Error ? err.message : err },
      '[aviator] @fastify/websocket недоступен — работает только REST-поллинг',
    );
  }

  // ── Driver-loop: двигает фазы раунда ──────────────────────────────────────
  // Множитель по проводам НЕ гоняем: клиент считает его сам по той же кривой от
  // startedAt (см. lib/aviatorOdds.ts), а сервер шлёт только смены фаз, ставки,
  // кэшауты и краш. Это убирает ~5 сообщений/сек на каждого зрителя.
  const loop = setInterval(() => {
    const now = Date.now();
    // Работаем только когда есть аудитория (сокеты) или живой раунд с игроками —
    // иначе игра «спит» и создаётся лениво по REST-запросу.
    const active = sockets.size > 0 || (currentRound && currentRound.bets.some((b) => !b.isBot));
    if (!active && !currentRound) return;
    void tick(now, sockets.size > 0);
  }, LOOP_INTERVAL_MS);
  loop.unref?.();

  app.addHook('onClose', async () => {
    clearInterval(loop);
    for (const ws of sockets) {
      try {
        (ws as unknown as { close?: () => void }).close?.();
      } catch {
        /* ignore */
      }
    }
    sockets.clear();
  });
}
