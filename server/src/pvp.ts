import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type BetterSqlite3 from 'better-sqlite3';
import crypto from 'crypto';
import {
  type CardType,
  compareCards, randomCard, xpToNextLevel,
  XP_WIN, XP_DRAW, XP_LOSE, RATING_WIN, RATING_LOSE,
  BOT_ID, ROUND_DURATION_MS, QUEUE_BOT_TIMEOUT_MS, ROUNDS_TOTAL, ROUNDS_TO_WIN,
} from './pvpEngine.js';

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

interface QueueRow { user_id: number; queued_at: number; }
interface MatchRow  { match_id: string; player1: number; player2: number; state_json: string; }
interface StatsRow  { user_id: number; level: number; xp: number; rating: number; wins: number; losses: number; draws: number; }
interface ProfileRow { name: string; photo_url: string | null; }

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
    db: InstanceType<typeof BetterSqlite3>;
    getUserId: (req: FastifyRequest) => number;
  },
) {
  const { db, getUserId } = deps;

  // ── Prepared statements ────────────────────────────────────────────────────

  const queueGet    = db.prepare<[number], QueueRow>('SELECT user_id, queued_at FROM pvp_queue WHERE user_id = ?');
  const queueInsert = db.prepare('INSERT OR REPLACE INTO pvp_queue(user_id, queued_at) VALUES(?,?)');
  const queueDelete = db.prepare('DELETE FROM pvp_queue WHERE user_id = ?');
  const queueAny    = db.prepare<[number], QueueRow>('SELECT user_id, queued_at FROM pvp_queue WHERE user_id != ? ORDER BY queued_at ASC LIMIT 1');

  const matchInsert = db.prepare('INSERT INTO pvp_matches(match_id, player1, player2, state_json, created_at, updated_at) VALUES(?,?,?,?,?,?)');
  const matchUpdate = db.prepare('UPDATE pvp_matches SET state_json = ?, updated_at = ? WHERE match_id = ?');
  const matchGet    = db.prepare<[string], MatchRow>('SELECT match_id, player1, player2, state_json FROM pvp_matches WHERE match_id = ?');
  const matchActive = db.prepare<[number, number], MatchRow>(
    `SELECT match_id, player1, player2, state_json FROM pvp_matches
     WHERE (player1 = ? OR player2 = ?)
       AND json_extract(state_json, '$.phase') = 'choosing'
     ORDER BY created_at DESC LIMIT 1`,
  );

  const statsGet    = db.prepare<[number], StatsRow>('SELECT * FROM pvp_stats WHERE user_id = ?');
  const statsUpsert = db.prepare(`
    INSERT INTO pvp_stats(user_id) VALUES(?)
    ON CONFLICT(user_id) DO NOTHING
  `);
  const statsUpdate = db.prepare(`
    UPDATE pvp_stats SET level=?, xp=?, rating=?, wins=?, losses=?, draws=? WHERE user_id=?
  `);
  const profileGet  = db.prepare<[number], ProfileRow>('SELECT name, photo_url FROM user_profiles WHERE user_id = ?');

  // ── Helpers ────────────────────────────────────────────────────────────────

  function ensureStats(userId: number): StatsRow {
    statsUpsert.run(userId);
    return statsGet.get(userId)!;
  }

  function awardXpRating(userId: number, result: 'win' | 'lose' | 'draw'): { xp: number; rating: number } {
    const stats = ensureStats(userId);
    const xpGain = result === 'win' ? XP_WIN : result === 'draw' ? XP_DRAW : XP_LOSE;
    const ratChange = result === 'win' ? RATING_WIN : result === 'lose' ? RATING_LOSE : 0;

    let xp     = stats.xp + xpGain;
    let level  = stats.level;
    while (xp >= xpToNextLevel(level)) { xp -= xpToNextLevel(level); level++; }

    const rating = Math.max(0, stats.rating + ratChange);
    const wins   = stats.wins   + (result === 'win'  ? 1 : 0);
    const losses = stats.losses + (result === 'lose' ? 1 : 0);
    const draws  = stats.draws  + (result === 'draw' ? 1 : 0);

    statsUpdate.run(level, xp, rating, wins, losses, draws, userId);
    return { xp: xpGain, rating: ratChange };
  }

  function awardMatch(matchId: string, state: StoredMatch): void {
    if (state.xpAwarded || state.phase !== 'finished' || !state.matchResult) return;

    const p1Result: 'win' | 'lose' | 'draw' =
      state.matchResult === 'p1' ? 'win' : state.matchResult === 'draw' ? 'draw' : 'lose';
    const p2Result: 'win' | 'lose' | 'draw' =
      state.matchResult === 'p2' ? 'win' : state.matchResult === 'draw' ? 'draw' : 'lose';

    const p1Award = awardXpRating(state.player1, p1Result);
    state.p1XpGained    = p1Award.xp;
    state.p1RatingChange = p1Award.rating;

    if (state.player2 !== BOT_ID) {
      const p2Award = awardXpRating(state.player2, p2Result);
      state.p2XpGained    = p2Award.xp;
      state.p2RatingChange = p2Award.rating;
    }

    state.xpAwarded = true;
    matchUpdate.run(JSON.stringify(state), Date.now(), matchId);
  }

  function readMatch(matchId: string): { row: MatchRow; state: StoredMatch } | null {
    const row = matchGet.get(matchId);
    if (!row) return null;
    const state = JSON.parse(row.state_json) as StoredMatch;
    return { row, state };
  }

  function opponentName(state: StoredMatch, userId: number): string {
    const opponentId = state.player1 === userId ? state.player2 : state.player1;
    if (opponentId === BOT_ID) return '🤖 Бот';
    const p = profileGet.get(opponentId);
    return p?.name ?? `Игрок #${opponentId}`;
  }

  function processAndSave(matchId: string, state: StoredMatch): void {
    const changed = advance(state);
    if (state.phase === 'finished' && !state.xpAwarded) awardMatch(matchId, state);
    if (changed || (state.phase === 'finished' && state.xpAwarded)) {
      matchUpdate.run(JSON.stringify(state), Date.now(), matchId);
    }
  }

  function jsonError(reply: FastifyReply, code: number, message: string) {
    return reply.status(code).send({ message });
  }

  // ── GET /api/pvp/stats ────────────────────────────────────────────────────

  app.get('/api/pvp/stats', async req => {
    const userId = getUserId(req);
    const stats  = ensureStats(userId);
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
    const userId = getUserId(req);
    const now    = Date.now();

    // Already in an active match?
    const active = matchActive.get(userId, userId);
    if (active) {
      const state = JSON.parse(active.state_json) as StoredMatch;
      processAndSave(active.match_id, state);
      return { status: 'matched', matchId: active.match_id };
    }

    // Look for another waiting player
    const other = queueAny.get(userId) as QueueRow | undefined;
    if (other) {
      // Create real match
      queueDelete.run(userId);
      queueDelete.run(other.user_id);
      const matchId = crypto.randomUUID();
      const state   = newMatch(userId, other.user_id);
      matchInsert.run(matchId, userId, other.user_id, JSON.stringify(state), now, now);
      return { status: 'matched', matchId };
    }

    // Check if already in queue
    const inQueue = queueGet.get(userId) as QueueRow | undefined;
    const queuedAt = inQueue?.queued_at ?? now;

    // Bot timeout?
    if (inQueue && now - queuedAt >= QUEUE_BOT_TIMEOUT_MS) {
      queueDelete.run(userId);
      const matchId = crypto.randomUUID();
      const state   = newMatch(userId, BOT_ID);
      matchInsert.run(matchId, userId, BOT_ID, JSON.stringify(state), now, now);
      return { status: 'matched', matchId };
    }

    // Enter / stay in queue
    if (!inQueue) queueInsert.run(userId, now);
    return { status: 'queuing', queuedAt: inQueue ? queuedAt : now };
  });

  // ── DELETE /api/pvp/queue ─────────────────────────────────────────────────

  app.delete('/api/pvp/queue', async req => {
    const userId = getUserId(req);
    queueDelete.run(userId);
    return { ok: true };
  });

  // ── GET /api/pvp/match/:matchId ───────────────────────────────────────────

  app.get<{ Params: { matchId: string } }>(
    '/api/pvp/match/:matchId',
    async (req, reply) => {
      const userId = getUserId(req);
      const { matchId } = req.params;

      const m = readMatch(matchId);
      if (!m) return jsonError(reply, 404, 'Матч не найден');
      if (m.state.player1 !== userId && m.state.player2 !== userId)
        return jsonError(reply, 403, 'Нет доступа к этому матчу');

      processAndSave(matchId, m.state);
      return buildView(matchId, m.state, userId, opponentName(m.state, userId));
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
      const userId  = getUserId(req);
      const { matchId } = req.params;
      const card    = req.body?.card as CardType;

      const m = readMatch(matchId);
      if (!m) return jsonError(reply, 404, 'Матч не найден');

      const { state } = m;
      if (state.player1 !== userId && state.player2 !== userId)
        return jsonError(reply, 403, 'Нет доступа');
      if (state.phase === 'finished')
        return jsonError(reply, 400, 'Матч уже завершён');

      const isP1 = state.player1 === userId;

      // Can only choose if hasn't chosen yet this round
      if (isP1 && state.p1Choice !== null)
        return jsonError(reply, 400, 'Вы уже выбрали карту в этом раунде');
      if (!isP1 && state.p2Choice !== null)
        return jsonError(reply, 400, 'Вы уже выбрали карту в этом раунде');

      if (isP1) state.p1Choice = card;
      else      state.p2Choice = card;

      processAndSave(matchId, state);
      return buildView(matchId, state, userId, opponentName(state, userId));
    },
  );
}
