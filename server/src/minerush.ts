import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';
import {
  ALLOWED_BETS,
  type Difficulty,
  GRID_SIZE,
  cellKey,
  countAdjacent,
  floodReveal,
  generateMines,
  parseKey,
  payoutForCashout,
  payoutForWin,
  totalSafeCells,
  mineCountFor,
} from './mineRushEngine.js';
import { getSupabase, parseJsonField } from './supabaseStore.js';
import { onGamePlayXp, onGameWinXp } from './progressAwards.js';
import { XP } from './xp.js';

interface GameRow {
  game_id: string;
  user_id: number;
  bet: number;
  difficulty: Difficulty;
  mines_json: unknown;
  revealed_json: unknown;
  flags_json: unknown;
  status: string;
  score: number;
  started_at: number;
  first_click: number;
}

function isDifficulty(v: unknown): v is Difficulty {
  return v === 'easy' || v === 'medium' || v === 'hard';
}

function serializeSet(set: Set<string>): string[] {
  return [...set];
}

function deserializeSet(value: unknown): Set<string> {
  const arr = parseJsonField<unknown[]>(value, []);
  return new Set(Array.isArray(arr) ? arr.map(String) : []);
}

function publicCell(mines: Set<string>, revealed: Set<string>, key: string) {
  if (!revealed.has(key)) return { key, state: 'hidden' as const };
  if (mines.has(key)) return { key, state: 'mine' as const };
  const { x, y } = parseKey(key);
  return { key, state: 'number' as const, value: countAdjacent(mines, x, y) };
}

function buildBoard(mines: Set<string>, revealed: Set<string>) {
  const cells = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      cells.push(publicCell(mines, revealed, cellKey(x, y)));
    }
  }
  return cells;
}

function throwSb(error: { message?: string } | null, context: string): never {
  throw new Error(`${context}: ${error?.message ?? 'unknown Supabase error'}`);
}

export function registerMineRushRoutes(
  app: FastifyInstance,
  deps: {
    getUserId: (req: FastifyRequest) => Promise<number>;
    getBalance: (userId: number) => Promise<number>;
    tryDeductBalance: (userId: number, amount: number) => Promise<number | null>;
    addBalance: (userId: number, delta: number) => Promise<number>;
  },
) {
  const { getUserId, getBalance, tryDeductBalance, addBalance } = deps;

  async function getGame(gameId: string): Promise<GameRow | null> {
    const sb = getSupabase();
    const { data, error } = await sb.from('minerush_games').select('*').eq('game_id', gameId).maybeSingle();
    if (error) throwSb(error, 'minerush getGame');
    if (!data) return null;
    return {
      game_id: data.game_id as string,
      user_id: Number(data.user_id),
      bet: Number(data.bet),
      difficulty: data.difficulty as Difficulty,
      mines_json: data.mines_json,
      revealed_json: data.revealed_json,
      flags_json: data.flags_json,
      status: data.status as string,
      score: Number(data.score),
      started_at: Number(data.started_at),
      first_click: Number(data.first_click),
    };
  }

  async function getActive(userId: number): Promise<GameRow | null> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('minerush_games')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throwSb(error, 'minerush getActive');
    if (!data) return null;
    return {
      game_id: data.game_id as string,
      user_id: Number(data.user_id),
      bet: Number(data.bet),
      difficulty: data.difficulty as Difficulty,
      mines_json: data.mines_json,
      revealed_json: data.revealed_json,
      flags_json: data.flags_json,
      status: data.status as string,
      score: Number(data.score),
      started_at: Number(data.started_at),
      first_click: Number(data.first_click),
    };
  }

  async function insertGame(row: {
    game_id: string;
    user_id: number;
    bet: number;
    difficulty: Difficulty;
    mines_json: string[];
    started_at: number;
  }) {
    const sb = getSupabase();
    const { error } = await sb.from('minerush_games').insert({
      game_id: row.game_id,
      user_id: row.user_id,
      bet: row.bet,
      difficulty: row.difficulty,
      mines_json: row.mines_json,
      revealed_json: [],
      flags_json: [],
      status: 'active',
      score: 0,
      started_at: row.started_at,
      first_click: 0,
    });
    if (error) throwSb(error, 'minerush insertGame');
  }

  async function updateGame(
    gameId: string,
    patch: {
      mines_json: string[];
      revealed_json: string[];
      flags_json: string[];
      status: string;
      score: number;
      first_click: number;
    },
  ) {
    const sb = getSupabase();
    const { error } = await sb.from('minerush_games').update(patch).eq('game_id', gameId);
    if (error) throwSb(error, 'minerush updateGame');
  }

  function jsonError(reply: FastifyReply, statusCode: number, message: string) {
    return reply.status(statusCode).send({ message });
  }

  function toView(row: GameRow, balance: number) {
    const mines = deserializeSet(row.mines_json);
    const revealed = deserializeSet(row.revealed_json);
    const flags = deserializeSet(row.flags_json);
    return {
      gameId: row.game_id,
      bet: row.bet,
      difficulty: row.difficulty,
      status: row.status,
      score: row.score,
      balance,
      mineCount: mines.size,
      gridSize: GRID_SIZE,
      flags: [...flags],
      cells: buildBoard(mines, revealed),
      startedAt: row.started_at,
    };
  }

  app.get('/api/minerush/state', async (req) => {
    const userId = await getUserId(req);
    const row = await getActive(userId);
    const balance = await getBalance(userId);
    if (!row) return { game: null, balance };
    return { game: toView(row, balance), balance };
  });

  app.post<{ Body: { difficulty?: string; bet?: number } }>(
    '/api/minerush/start',
    async (req, reply) => {
      const userId = await getUserId(req);
      const difficulty = req.body?.difficulty;
      const bet = Number(req.body?.bet);
      if (!isDifficulty(difficulty)) return jsonError(reply, 400, 'Выберите сложность');
      if (!ALLOWED_BETS.includes(bet as (typeof ALLOWED_BETS)[number])) {
        return jsonError(reply, 400, 'Некорректная ставка');
      }

      const active = await getActive(userId);
      if (active) return jsonError(reply, 400, 'Завершите текущую игру');

      const afterBet = await tryDeductBalance(userId, bet);
      if (afterBet === null) return jsonError(reply, 400, 'Недостаточно звёзд');

      const mineCount = mineCountFor(difficulty, bet);
      const mines = generateMines(mineCount);
      const gameId = crypto.randomUUID();
      const now = Date.now();

      await insertGame({
        game_id: gameId,
        user_id: userId,
        bet,
        difficulty,
        mines_json: serializeSet(mines),
        started_at: now,
      });
      await onGamePlayXp(userId, 'minerush');

      const row = (await getGame(gameId))!;
      return toView(row, await getBalance(userId));
    },
  );

  app.post<{ Body: { gameId?: string; x?: number; y?: number } }>(
    '/api/minerush/reveal',
    async (req, reply) => {
      const userId = await getUserId(req);
      const gameId = String(req.body?.gameId ?? '');
      const x = Number(req.body?.x);
      const y = Number(req.body?.y);
      if (!gameId || !Number.isInteger(x) || !Number.isInteger(y)) {
        return jsonError(reply, 400, 'Некорректные координаты');
      }
      if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) {
        return jsonError(reply, 400, 'Клетка вне поля');
      }

      const row = await getGame(gameId);
      if (!row || row.user_id !== userId) return jsonError(reply, 404, 'Игра не найдена');
      if (row.status !== 'active') return jsonError(reply, 400, 'Игра уже завершена');

      let mines = deserializeSet(row.mines_json);
      const revealed = deserializeSet(row.revealed_json);
      const flags = deserializeSet(row.flags_json);
      const key = cellKey(x, y);
      if (flags.has(key)) return jsonError(reply, 400, 'Снимите флаг');
      if (revealed.has(key)) return toView(row, await getBalance(userId));

      let firstClick = row.first_click;
      if (!firstClick) {
        if (mines.has(key)) {
          mines = generateMines(mineCountFor(row.difficulty as Difficulty, row.bet), { x, y });
        }
        firstClick = 1;
      }

      let status = row.status;
      let score = row.score;
      let exploded: string | null = null;

      if (mines.has(key)) {
        revealed.add(key);
        status = 'lost';
        exploded = key;
      } else {
        floodReveal(mines, revealed, x, y);
        score = revealed.size;
        if (score >= totalSafeCells(mines.size)) {
          status = 'won';
          const payout = payoutForWin(row.bet, row.difficulty as Difficulty);
          await addBalance(userId, payout);
          await onGameWinXp(userId, XP.MINERUSH_CASHOUT(score), 'minerush');
        }
      }

      await updateGame(gameId, {
        mines_json: serializeSet(mines),
        revealed_json: serializeSet(revealed),
        flags_json: serializeSet(flags),
        status,
        score,
        first_click: firstClick,
      });

      const updated = (await getGame(gameId))!;
      return { ...toView(updated, await getBalance(userId)), exploded };
    },
  );

  app.post<{ Body: { gameId?: string; x?: number; y?: number } }>(
    '/api/minerush/flag',
    async (req, reply) => {
      const userId = await getUserId(req);
      const gameId = String(req.body?.gameId ?? '');
      const x = Number(req.body?.x);
      const y = Number(req.body?.y);
      const row = await getGame(gameId);
      if (!row || row.user_id !== userId) return jsonError(reply, 404, 'Игра не найдена');
      if (row.status !== 'active') return jsonError(reply, 400, 'Игра уже завершена');

      const revealed = deserializeSet(row.revealed_json);
      const flags = deserializeSet(row.flags_json);
      const key = cellKey(x, y);
      if (revealed.has(key)) return toView(row, await getBalance(userId));
      if (flags.has(key)) flags.delete(key);
      else flags.add(key);

      await updateGame(gameId, {
        mines_json: serializeSet(deserializeSet(row.mines_json)),
        revealed_json: serializeSet(revealed),
        flags_json: serializeSet(flags),
        status: row.status,
        score: row.score,
        first_click: row.first_click,
      });
      return toView((await getGame(gameId))!, await getBalance(userId));
    },
  );

  app.post<{ Body: { gameId?: string } }>('/api/minerush/cashout', async (req, reply) => {
    const userId = await getUserId(req);
    const gameId = String(req.body?.gameId ?? '');
    const row = await getGame(gameId);
    if (!row || row.user_id !== userId) return jsonError(reply, 404, 'Игра не найдена');
    if (row.status !== 'active') return jsonError(reply, 400, 'Игра уже завершена');
    if (row.score <= 0) return jsonError(reply, 400, 'Откройте хотя бы одну клетку');

    const mines = deserializeSet(row.mines_json);
    const payout = payoutForCashout(
      row.bet,
      row.score,
      mines.size,
      row.difficulty as Difficulty,
    );
    await addBalance(userId, payout);
    await updateGame(gameId, {
      mines_json: serializeSet(deserializeSet(row.mines_json)),
      revealed_json: serializeSet(deserializeSet(row.revealed_json)),
      flags_json: serializeSet(deserializeSet(row.flags_json)),
      status: 'cashed',
      score: row.score,
      first_click: row.first_click,
    });
    await onGameWinXp(userId, XP.MINERUSH_CASHOUT(row.score), 'minerush');
    const updated = (await getGame(gameId))!;
    return { ...toView(updated, await getBalance(userId)), payout };
  });
}
