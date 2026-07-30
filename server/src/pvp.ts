import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import {
  type CardType,
  compareCards, randomCard, xpToNextLevel,
  XP_WIN, XP_DRAW, XP_LOSE, RATING_WIN, RATING_LOSE,
  BOT_ID, ROUND_DURATION_MS, QUEUE_BOT_TIMEOUT_MS, ROUNDS_TOTAL, ROUNDS_TO_WIN,
} from './pvpEngine.js';
import { getSupabase, parseJsonField } from './supabaseStore.js';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CompletedRound {
  p1Card: CardType;
  p2Card: CardType;
  result: 'p1' | 'p2' | 'draw';
}

interface StoredMatch {
  player1: number;
  player2: number; // BOT_ID = 0
  phase: 'choosing' | 'finished';
  currentRound: number;
  roundStartedAt: number;
  p1Choice: CardType | null;
  p2Choice: CardType | null;
  completedRounds: CompletedRound[];
  scores: { p1: number; p2: number };
  matchResult: 'p1' | 'p2' | 'draw' | null;
  xpAwarded: boolean;
  p1XpGained: number;
  p2XpGained: number;
  p1RatingChange: number;
  p2RatingChange: number;
}

interface MatchRow  { match_id: string; player1: number; player2: number; state_json: unknown; }
interface StatsRow  { user_id: number; level: number; xp: number; rating: number; wins: number; losses: number; draws: number; }
interface QueueRow { user_id: number; queued_at: number; }

function throwSb(error: { message?: string } | null, context: string): never {
  throw new Error(`${context}: ${error?.message ?? 'unknown Supabase error'}`);
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function newMatch(p1: number, p2: number): StoredMatch {
  return {
    player1: p1,
    player2: p2,
    phase: 'choosing',
    currentRound: 0,
    roundStartedAt: Date.now(),
    p1Choice: null,
    p2Choice: p2 === BOT_ID ? randomCard() : null,
    completedRounds: [],
    scores: { p1: 0, p2: 0 },
    matchResult: null,
    xpAwarded: false,
    p1XpGained: 0,
    p2XpGained: 0,
    p1RatingChange: 0,
    p2RatingChange: 0,
  };
}

/** Advance match state if a round should be resolved. Returns true if state changed. */
function advance(state: StoredMatch, now = Date.now()): boolean {
  if (state.phase === 'finished') return false;

  const expired    = now >= state.roundStartedAt + ROUND_DURATION_MS;
  const bothChose  = state.p1Choice !== null && state.p2Choice !== null;
  if (!expired && !bothChose) return false;

  const p1Card = state.p1Choice ?? randomCard();
  const p2Card = state.p2Choice ?? randomCard();
  const cmp    = compareCards(p1Card, p2Card);
  const result: 'p1' | 'p2' | 'draw' =
    cmp === 'win' ? 'p1' : cmp === 'lose' ? 'p2' : 'draw';

  state.completedRounds.push({ p1Card, p2Card, result });
  if (result === 'p1') state.scores.p1++;
  else if (result === 'p2') state.scores.p2++;

  state.currentRound++;

  const over =
    state.scores.p1 >= ROUNDS_TO_WIN ||
    state.scores.p2 >= ROUNDS_TO_WIN ||
    state.currentRound >= ROUNDS_TOTAL;

  if (over) {
    state.phase = 'finished';
    state.matchResult =
      state.scores.p1 > state.scores.p2 ? 'p1' :
      state.scores.p2 > state.scores.p1 ? 'p2' : 'draw';
  } else {
    state.p1Choice = null;
    state.p2Choice = state.player2 === BOT_ID ? randomCard() : null;
    state.roundStartedAt = now;
  }
  return true;
}

function buildView(matchId: string, state: StoredMatch, userId: number, opponentName: string) {
  const isP1 = state.player1 === userId;

  return {
    matchId,
    isBot:        state.player2 === BOT_ID,
    opponentName,
    myRole:       isP1 ? 'p1' : 'p2',
    phase:        state.phase,
    currentRound: state.currentRound,
    roundEndsAt:  state.roundStartedAt + ROUND_DURATION_MS,
    scores: {
      me:       isP1 ? state.scores.p1 : state.scores.p2,
      opponent: isP1 ? state.scores.p2 : state.scores.p1,
    },
    myCardThisRound: isP1 ? state.p1Choice : state.p2Choice,
    rounds: state.completedRounds.map(r => ({
      myCard:       isP1 ? r.p1Card : r.p2Card,
      opponentCard: isP1 ? r.p2Card : r.p1Card,
      result: r.result === 'draw' ? 'draw'
        : r.result === (isP1 ? 'p1' : 'p2') ? 'win' : 'lose',
    })),
    matchResult:
      state.matchResult === null ? null :
      state.matchResult === 'draw' ? 'draw' :
      state.matchResult === (isP1 ? 'p1' : 'p2') ? 'win' : 'lose',
    xpGained:     isP1 ? state.p1XpGained     : state.p2XpGained,
    ratingChange: isP1 ? state.p1RatingChange  : state.p2RatingChange,
  };
}

// ── Route registration ─────────────────────────────────────────────────────────

export function registerPvpRoutes(
  app: FastifyInstance,
  deps: {
    getUserId: (req: FastifyRequest) => Promise<number>;
  },
) {
  const { getUserId } = deps;

  async function queueGet(userId: number): Promise<QueueRow | null> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('pvp_queue')
      .select('user_id, queued_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throwSb(error, 'pvp queueGet');
    if (!data) return null;
    return { user_id: Number(data.user_id), queued_at: Number(data.queued_at) };
  }

  async function queueInsert(userId: number, queuedAt: number) {
    const sb = getSupabase();
    const { error } = await sb.from('pvp_queue').upsert(
      { user_id: userId, queued_at: queuedAt },
      { onConflict: 'user_id' },
    );
    if (error) throwSb(error, 'pvp queueInsert');
  }

  async function queueDelete(userId: number) {
    const sb = getSupabase();
    const { error } = await sb.from('pvp_queue').delete().eq('user_id', userId);
    if (error) throwSb(error, 'pvp queueDelete');
  }

  async function queueAny(excludeUserId: number): Promise<QueueRow | null> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('pvp_queue')
      .select('user_id, queued_at')
      .neq('user_id', excludeUserId)
      .order('queued_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throwSb(error, 'pvp queueAny');
    if (!data) return null;
    return { user_id: Number(data.user_id), queued_at: Number(data.queued_at) };
  }

  async function matchInsert(matchId: string, p1: number, p2: number, state: StoredMatch, now: number) {
    const sb = getSupabase();
    const { error } = await sb.from('pvp_matches').insert({
      match_id: matchId,
      player1: p1,
      player2: p2,
      state_json: state,
      created_at: now,
      updated_at: now,
    });
    if (error) throwSb(error, 'pvp matchInsert');
  }

  async function matchUpdate(matchId: string, state: StoredMatch) {
    const sb = getSupabase();
    const { error } = await sb
      .from('pvp_matches')
      .update({ state_json: state, updated_at: Date.now() })
      .eq('match_id', matchId);
    if (error) throwSb(error, 'pvp matchUpdate');
  }

  async function matchGet(matchId: string): Promise<MatchRow | null> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('pvp_matches')
      .select('match_id, player1, player2, state_json')
      .eq('match_id', matchId)
      .maybeSingle();
    if (error) throwSb(error, 'pvp matchGet');
    if (!data) return null;
    return {
      match_id: data.match_id as string,
      player1: Number(data.player1),
      player2: Number(data.player2),
      state_json: data.state_json,
    };
  }

  async function matchActive(userId: number): Promise<MatchRow | null> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('pvp_matches')
      .select('match_id, player1, player2, state_json, created_at')
      .or(`player1.eq.${userId},player2.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throwSb(error, 'pvp matchActive');
    for (const row of data ?? []) {
      const state = parseJsonField<StoredMatch | null>(row.state_json, null);
      if (state?.phase === 'choosing') {
        return {
          match_id: row.match_id as string,
          player1: Number(row.player1),
          player2: Number(row.player2),
          state_json: row.state_json,
        };
      }
    }
    return null;
  }

  async function statsGet(userId: number): Promise<StatsRow | null> {
    const sb = getSupabase();
    const { data, error } = await sb.from('pvp_stats').select('*').eq('user_id', userId).maybeSingle();
    if (error) throwSb(error, 'pvp statsGet');
    if (!data) return null;
    return {
      user_id: Number(data.user_id),
      level: Number(data.level),
      xp: Number(data.xp),
      rating: Number(data.rating),
      wins: Number(data.wins),
      losses: Number(data.losses),
      draws: Number(data.draws),
    };
  }

  async function ensureStats(userId: number): Promise<StatsRow> {
    const existing = await statsGet(userId);
    if (existing) return existing;
    const sb = getSupabase();
    const { error } = await sb.from('pvp_stats').upsert(
      { user_id: userId },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );
    if (error) throwSb(error, 'pvp ensureStats');
    const row = await statsGet(userId);
    if (!row) {
      return { user_id: userId, level: 1, xp: 0, rating: 1000, wins: 0, losses: 0, draws: 0 };
    }
    return row;
  }

  async function statsUpdate(row: StatsRow) {
    const sb = getSupabase();
    const { error } = await sb
      .from('pvp_stats')
      .update({
        level: row.level,
        xp: row.xp,
        rating: row.rating,
        wins: row.wins,
        losses: row.losses,
        draws: row.draws,
      })
      .eq('user_id', row.user_id);
    if (error) throwSb(error, 'pvp statsUpdate');
  }

  async function profileName(userId: number): Promise<string | null> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('user_profiles')
      .select('name')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throwSb(error, 'pvp profileName');
    return (data?.name as string) ?? null;
  }

  async function awardXpRating(userId: number, result: 'win' | 'lose' | 'draw'): Promise<{ xp: number; rating: number }> {
    const stats = await ensureStats(userId);
    const xpGain = result === 'win' ? XP_WIN : result === 'draw' ? XP_DRAW : XP_LOSE;
    const ratChange = result === 'win' ? RATING_WIN : result === 'lose' ? RATING_LOSE : 0;

    let xp     = stats.xp + xpGain;
    let level  = stats.level;
    while (xp >= xpToNextLevel(level)) { xp -= xpToNextLevel(level); level++; }

    const rating = Math.max(0, stats.rating + ratChange);
    const wins   = stats.wins   + (result === 'win'  ? 1 : 0);
    const losses = stats.losses + (result === 'lose' ? 1 : 0);
    const draws  = stats.draws  + (result === 'draw' ? 1 : 0);

    await statsUpdate({ user_id: userId, level, xp, rating, wins, losses, draws });
    return { xp: xpGain, rating: ratChange };
  }

  async function awardMatch(matchId: string, state: StoredMatch): Promise<void> {
    if (state.xpAwarded || state.phase !== 'finished' || !state.matchResult) return;

    const p1Result: 'win' | 'lose' | 'draw' =
      state.matchResult === 'p1' ? 'win' : state.matchResult === 'draw' ? 'draw' : 'lose';
    const p2Result: 'win' | 'lose' | 'draw' =
      state.matchResult === 'p2' ? 'win' : state.matchResult === 'draw' ? 'draw' : 'lose';

    const p1Award = await awardXpRating(state.player1, p1Result);
    state.p1XpGained    = p1Award.xp;
    state.p1RatingChange = p1Award.rating;

    if (state.player2 !== BOT_ID) {
      const p2Award = await awardXpRating(state.player2, p2Result);
      state.p2XpGained    = p2Award.xp;
      state.p2RatingChange = p2Award.rating;
    }

    state.xpAwarded = true;
    await matchUpdate(matchId, state);
  }

  async function readMatch(matchId: string): Promise<{ row: MatchRow; state: StoredMatch } | null> {
    const row = await matchGet(matchId);
    if (!row) return null;
    const state = parseJsonField<StoredMatch>(row.state_json, null as unknown as StoredMatch);
    if (!state || typeof state !== 'object') return null;
    return { row, state };
  }

  async function opponentName(state: StoredMatch, userId: number): Promise<string> {
    const opponentId = state.player1 === userId ? state.player2 : state.player1;
    if (opponentId === BOT_ID) return '🤖 Бот';
    const name = await profileName(opponentId);
    return name ?? `Игрок #${opponentId}`;
  }

  async function processAndSave(matchId: string, state: StoredMatch): Promise<void> {
    const changed = advance(state);
    if (state.phase === 'finished' && !state.xpAwarded) await awardMatch(matchId, state);
    if (changed || (state.phase === 'finished' && state.xpAwarded)) {
      await matchUpdate(matchId, state);
    }
  }

  function jsonError(reply: FastifyReply, code: number, message: string) {
    return reply.status(code).send({ message });
  }

  // ── GET /api/pvp/stats ────────────────────────────────────────────────────

  app.get('/api/pvp/stats', async req => {
    const userId = await getUserId(req);
    const stats  = await ensureStats(userId);
    return {
      level:          stats.level,
      xp:             stats.xp,
      xpForNextLevel: xpToNextLevel(stats.level),
      rating:         stats.rating,
      wins:           stats.wins,
      losses:         stats.losses,
      draws:          stats.draws,
    };
  });

  // ── POST /api/pvp/find — join queue or get matched ───────────────────────

  app.post('/api/pvp/find', async (req, reply) => {
    const userId = await getUserId(req);
    const now    = Date.now();

    const active = await matchActive(userId);
    if (active) {
      const state = parseJsonField<StoredMatch>(active.state_json, null as unknown as StoredMatch);
      if (state) await processAndSave(active.match_id, state);
      return { status: 'matched', matchId: active.match_id };
    }

    const other = await queueAny(userId);
    if (other) {
      await queueDelete(userId);
      await queueDelete(other.user_id);
      const matchId = crypto.randomUUID();
      const state   = newMatch(userId, other.user_id);
      await matchInsert(matchId, userId, other.user_id, state, now);
      return { status: 'matched', matchId };
    }

    const inQueue = await queueGet(userId);
    const queuedAt = inQueue?.queued_at ?? now;

    if (inQueue && now - queuedAt >= QUEUE_BOT_TIMEOUT_MS) {
      await queueDelete(userId);
      const matchId = crypto.randomUUID();
      const state   = newMatch(userId, BOT_ID);
      await matchInsert(matchId, userId, BOT_ID, state, now);
      return { status: 'matched', matchId };
    }

    if (!inQueue) await queueInsert(userId, now);
    return { status: 'queuing', queuedAt: inQueue ? queuedAt : now };
  });

  // ── DELETE /api/pvp/queue ─────────────────────────────────────────────────

  app.delete('/api/pvp/queue', async req => {
    const userId = await getUserId(req);
    await queueDelete(userId);
    return { ok: true };
  });

  // ── GET /api/pvp/match/:matchId ───────────────────────────────────────────

  app.get<{ Params: { matchId: string } }>(
    '/api/pvp/match/:matchId',
    async (req, reply) => {
      const userId = await getUserId(req);
      const { matchId } = req.params;

      const m = await readMatch(matchId);
      if (!m) return jsonError(reply, 404, 'Матч не найден');
      if (m.state.player1 !== userId && m.state.player2 !== userId)
        return jsonError(reply, 403, 'Нет доступа к этому матчу');

      await processAndSave(matchId, m.state);
      return buildView(matchId, m.state, userId, await opponentName(m.state, userId));
    },
  );

  // ── POST /api/pvp/match/:matchId/choose ──────────────────────────────────

  app.post<{ Params: { matchId: string }; Body: { card?: string } }>(
    '/api/pvp/match/:matchId/choose',
    {
      schema: {
        body: {
          type: 'object',
          required: ['card'],
          properties: { card: { type: 'string', enum: ['attack', 'defense', 'speed'] } },
        },
      },
    },
    async (req, reply) => {
      const userId  = await getUserId(req);
      const { matchId } = req.params;
      const card    = req.body?.card as CardType;

      const m = await readMatch(matchId);
      if (!m) return jsonError(reply, 404, 'Матч не найден');

      const { state } = m;
      if (state.player1 !== userId && state.player2 !== userId)
        return jsonError(reply, 403, 'Нет доступа');
      if (state.phase === 'finished')
        return jsonError(reply, 400, 'Матч уже завершён');

      const isP1 = state.player1 === userId;

      if (isP1 && state.p1Choice !== null)
        return jsonError(reply, 400, 'Вы уже выбрали карту в этом раунде');
      if (!isP1 && state.p2Choice !== null)
        return jsonError(reply, 400, 'Вы уже выбрали карту в этом раунде');

      if (isP1) state.p1Choice = card;
      else      state.p2Choice = card;

      await processAndSave(matchId, state);
      return buildView(matchId, state, userId, await opponentName(state, userId));
    },
  );
}
