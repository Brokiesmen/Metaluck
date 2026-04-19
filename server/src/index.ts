import Fastify, { type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import staticFiles from '@fastify/static';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { PRIZES, CASES } from './data.js';
import { pickPrize } from './random.js';
import { validateInitData } from './auth.js';
import type { Prize } from './types.js';

// ── SQLite database ────────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, '../game.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS balances (
    user_id   INTEGER PRIMARY KEY,
    balance   INTEGER NOT NULL DEFAULT 15000
  );
  CREATE TABLE IF NOT EXISTS user_profiles (
    user_id   INTEGER PRIMARY KEY,
    name      TEXT NOT NULL,
    photo_url TEXT
  );
  CREATE TABLE IF NOT EXISTS histories (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER NOT NULL,
    case_id   INTEGER NOT NULL,
    case_name TEXT NOT NULL,
    prize     TEXT NOT NULL,
    ts        INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS histories_user ON histories(user_id, ts DESC);
  CREATE INDEX IF NOT EXISTS idx_balances_rank ON balances(balance DESC, user_id ASC);
  CREATE TABLE IF NOT EXISTS daily_states (
    user_id    INTEGER PRIMARY KEY,
    claimed_day INTEGER NOT NULL DEFAULT 0,
    last_claim_at INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS referrals (
    user_id        INTEGER PRIMARY KEY,
    code           TEXT NOT NULL UNIQUE,
    referred_by    INTEGER,
    referred_users TEXT NOT NULL DEFAULT '[]',
    total_earned   INTEGER NOT NULL DEFAULT 0
  );
`);

// ── Migrate from db.json if it exists ─────────────────────────────────────────
import fs from 'fs';
const JSON_PATH = path.join(__dirname, '../db.json');
if (fs.existsSync(JSON_PATH)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
    const migrate = db.transaction(() => {
      if (parsed.balances) {
        for (const [userId, balance] of parsed.balances) {
          db.prepare('INSERT OR IGNORE INTO balances(user_id, balance) VALUES(?,?)').run(userId, balance);
        }
      }
      if (parsed.userProfiles) {
        for (const [userId, p] of parsed.userProfiles) {
          db.prepare('INSERT OR IGNORE INTO user_profiles(user_id, name, photo_url) VALUES(?,?,?)').run(userId, p.name, p.photoUrl ?? null);
        }
      }
      if (parsed.histories) {
        for (const [userId, entries] of parsed.histories) {
          for (const e of entries) {
            db.prepare('INSERT OR IGNORE INTO histories(user_id, case_id, case_name, prize, ts) VALUES(?,?,?,?,?)')
              .run(userId, e.caseId, e.caseName, JSON.stringify(e.prize), e.timestamp);
          }
        }
      }
      if (parsed.dailyStates) {
        for (const [userId, s] of parsed.dailyStates) {
          db.prepare('INSERT OR IGNORE INTO daily_states(user_id, claimed_day, last_claim_at) VALUES(?,?,?)').run(userId, s.claimedDay, s.lastClaimAt);
        }
      }
      if (parsed.referrals) {
        for (const [userId, r] of parsed.referrals) {
          db.prepare('INSERT OR IGNORE INTO referrals(user_id, code, referred_by, referred_users, total_earned) VALUES(?,?,?,?,?)')
            .run(userId, r.code, r.referredBy ?? null, JSON.stringify(r.referredUsers), r.totalEarned);
        }
      }
    });
    migrate();
    fs.renameSync(JSON_PATH, JSON_PATH + '.migrated');
    console.log('✅ Migrated db.json → game.db');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

// ── DB helpers ─────────────────────────────────────────────────────────────────
const DEFAULT_BALANCE = 500;

function getBalance(userId: number): number {
  db.prepare('INSERT OR IGNORE INTO balances(user_id, balance) VALUES(?,?)').run(userId, DEFAULT_BALANCE);
  const row = db.prepare('SELECT balance FROM balances WHERE user_id = ?').get(userId) as { balance: number };
  return row.balance;
}

function setBalance(userId: number, balance: number) {
  db.prepare('INSERT INTO balances(user_id, balance) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET balance=excluded.balance').run(userId, balance);
}

function addHistory(userId: number, entry: HistoryEntry) {
  db.prepare('INSERT INTO histories(user_id, case_id, case_name, prize, ts) VALUES(?,?,?,?,?)').run(userId, entry.caseId, entry.caseName, JSON.stringify(entry.prize), entry.timestamp);
}

function getProfile(userId: number) {
  return db.prepare('SELECT name, photo_url FROM user_profiles WHERE user_id = ?').get(userId) as { name: string; photo_url?: string } | undefined;
}

function setProfile(userId: number, name: string, photoUrl?: string) {
  db.prepare('INSERT INTO user_profiles(user_id, name, photo_url) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET name=excluded.name, photo_url=excluded.photo_url').run(userId, name, photoUrl ?? null);
}

function getDailyState(userId: number) {
  return db.prepare('SELECT claimed_day, last_claim_at FROM daily_states WHERE user_id = ?').get(userId) as { claimed_day: number; last_claim_at: number } | undefined;
}

function setDailyState(userId: number, claimedDay: number, lastClaimAt: number) {
  db.prepare('INSERT INTO daily_states(user_id, claimed_day, last_claim_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET claimed_day=excluded.claimed_day, last_claim_at=excluded.last_claim_at').run(userId, claimedDay, lastClaimAt);
}

function getReferral(userId: number) {
  return db.prepare('SELECT * FROM referrals WHERE user_id = ?').get(userId) as { user_id: number; code: string; referred_by: number | null; referred_users: string; total_earned: number } | undefined;
}

function ensureReferral(userId: number) {
  const code = userId === 0 ? 'refdev' : `ref${userId}`;
  db.prepare('INSERT OR IGNORE INTO referrals(user_id, code, referred_users, total_earned) VALUES(?,?,?,?)').run(userId, code, '[]', 0);
  return getReferral(userId)!;
}

// ── App ────────────────────────────────────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production';
const app = Fastify({ logger: { level: 'info' } });
await app.register(cors, { origin: true });
await app.register(compress, { global: true });

if (isProd) {
  const clientDist = path.join(__dirname, '../../client/dist');
  await app.register(staticFiles, { root: clientDist, prefix: '/' });
}

// ── Daily reward config ───────────────────────────────────────────────────────
const DAILY_REWARDS = [
  { day: 1, type: 'stars' as const, stars: 50 },
  { day: 2, type: 'stars' as const, stars: 150 },
  { day: 3, type: 'gift'  as const, rarity: 'blue' },
  { day: 4, type: 'stars' as const, stars: 300 },
  { day: 5, type: 'gift'  as const, rarity: 'purple' },
  { day: 6, type: 'stars' as const, stars: 600 },
  { day: 7, type: 'gift'  as const, rarity: 'gold' },
];

const REFERRAL_REWARD = 500;

interface HistoryEntry {
  caseId: number;
  caseName: string;
  prize: Prize;
  timestamp: number;
}

function getUserId(req: FastifyRequest): number {
  const raw = req.headers['x-telegram-init-data'] as string | undefined;
  const result = validateInitData(raw);
  if (!result.valid) throw new Error('Unauthorized');

  if (result.user && result.userId) {
    const fn = (result.user.first_name as string) || '';
    const ln = (result.user.last_name as string) || '';
    const name = `${fn} ${ln}`.trim();
    const photoUrl = (result.user.photo_url as string) || undefined;
    if (name) {
      const existing = getProfile(result.userId);
      if (!existing || existing.name !== name || existing.photo_url !== photoUrl) {
        setProfile(result.userId, name, photoUrl);
      }
    }
  } else if (result.userId === 0 && !getProfile(0)) {
    setProfile(0, 'Dev User');
  }

  return result.userId;
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/api/balance', async req => {
  const userId = getUserId(req);
  return { balance: getBalance(userId) };
});

app.get('/api/prizes', async () => ({
  prizes: PRIZES.map(({ weight: _w, ...p }) => p),
}));

app.get('/api/cases', async () => ({ cases: CASES }));

app.get<{ Querystring: { page?: string; limit?: string } }>('/api/history', async req => {
  const userId = getUserId(req);
  const page  = Math.max(0, parseInt(req.query.page  ?? '0',  10) || 0);
  const limit = Math.min(50, Math.max(5,  parseInt(req.query.limit ?? '20', 10) || 20));
  const offset = page * limit;

  const { total } = db.prepare('SELECT COUNT(*) as total FROM histories WHERE user_id = ?').get(userId) as { total: number };
  const rows = db.prepare(
    'SELECT case_id, case_name, prize, ts FROM histories WHERE user_id = ? ORDER BY ts DESC LIMIT ? OFFSET ?'
  ).all(userId, limit, offset) as any[];

  return {
    history: rows.map(r => ({ caseId: r.case_id, caseName: r.case_name, prize: JSON.parse(r.prize), timestamp: r.ts })),
    pagination: { page, limit, total, hasMore: offset + limit < total },
  };
});

app.get<{ Querystring: { page?: string; limit?: string } }>('/api/leaders', async (req) => {
  const page  = Math.max(0, parseInt(req.query.page  ?? '0',  10) || 0);
  const limit = Math.min(100, Math.max(10, parseInt(req.query.limit ?? '50', 10) || 50));
  const offset = page * limit;

  const { total } = db.prepare('SELECT COUNT(*) as total FROM balances').get() as { total: number };

  const rows = db.prepare(`
    SELECT b.user_id, b.balance, p.name, p.photo_url
    FROM balances b
    LEFT JOIN user_profiles p ON b.user_id = p.user_id
    ORDER BY b.balance DESC, b.user_id ASC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as any[];

  return {
    leaders: rows.map(r => ({
      userId:   r.user_id,
      name:     r.name || 'Аноним',
      photoUrl: r.photo_url ?? undefined,
      balance:  r.balance,
    })),
    pagination: { page, limit, total, hasMore: offset + limit < total },
  };
});

// ── Daily reward ──────────────────────────────────────────────────────────────

app.get('/api/daily/status', async req => {
  const userId = getUserId(req);
  const state   = getDailyState(userId) ?? { claimed_day: 0, last_claim_at: 0 };
  const now     = Date.now();
  const ms24    = 24 * 60 * 60 * 1000;
  const ms48    = 48 * 60 * 60 * 1000;
  const elapsed = now - state.last_claim_at;

  let currentDay: number;
  let canClaim: boolean;
  let nextClaimAt = 0;

  if (!state.last_claim_at) {
    currentDay = 1; canClaim = true;
  } else if (elapsed >= ms48) {
    currentDay = 1; canClaim = true;
  } else if (elapsed >= ms24) {
    currentDay = state.claimed_day >= 7 ? 1 : state.claimed_day + 1;
    canClaim = true;
  } else {
    currentDay = state.claimed_day >= 7 ? 1 : state.claimed_day + 1;
    canClaim = false;
    nextClaimAt = state.last_claim_at + ms24;
  }

  const streakBroken = state.last_claim_at > 0 && elapsed >= ms48;
  const claimedDays  = Array.from({ length: 7 }, (_, i) =>
    !streakBroken && state.claimed_day > 0 && i < state.claimed_day
  );

  return { currentDay, canClaim, nextClaimAt, claimedDays };
});

app.post('/api/daily/claim', { schema: { body: { type: 'object' } } }, async (req, reply) => {
  const userId  = getUserId(req);
  const state   = getDailyState(userId) ?? { claimed_day: 0, last_claim_at: 0 };
  const now     = Date.now();
  const ms24    = 24 * 60 * 60 * 1000;
  const ms48    = 48 * 60 * 60 * 1000;
  const elapsed = now - state.last_claim_at;

  if (state.last_claim_at && elapsed < ms24) {
    return reply.status(400).send({ message: 'Уже забрано сегодня' });
  }

  let dayToClaim: number;
  if (!state.last_claim_at || elapsed >= ms48) {
    dayToClaim = 1;
  } else {
    dayToClaim = state.claimed_day >= 7 ? 1 : state.claimed_day + 1;
  }

  const reward = DAILY_REWARDS[dayToClaim - 1];
  let prize: Prize;
  let newBalance = getBalance(userId);

  if (reward.type === 'stars') {
    const stars = reward.stars!;
    newBalance += stars;
    setBalance(userId, newBalance);
    prize = { id: 900 + dayToClaim, name: `${stars} звёзд`, rarity: 'gold', icon: '⭐', stars };
  } else {
    const candidates = PRIZES.filter(p => p.rarity === reward.rarity && !p.stars && !p.isPremium);
    prize = candidates[Math.floor(Math.random() * candidates.length)];
    addHistory(userId, { caseId: 0, caseName: 'Ежедневный подарок', prize, timestamp: now });
  }

  setDailyState(userId, dayToClaim, now);
  return { prize, newBalance, day: dayToClaim };
});

// ── Referral ──────────────────────────────────────────────────────────────────

app.get('/api/referral/status', async req => {
  const userId = getUserId(req);
  const data   = ensureReferral(userId);
  const refs   = JSON.parse(data.referred_users) as number[];
  return { code: data.code, referredCount: refs.length, totalEarned: data.total_earned };
});

interface ActivateBody { code: string }

app.post<{ Body: ActivateBody }>('/api/referral/activate', {
  schema: { body: { type: 'object', required: ['code'], properties: { code: { type: 'string' } } } },
}, async (req, reply) => {
  const userId     = getUserId(req);
  const { code }   = req.body;
  const referrerId = code === 'refdev' ? 0 : parseInt(code.replace(/^ref/, ''), 10);
  if (isNaN(referrerId)) return reply.status(400).send({ message: 'Неверный код' });
  if (referrerId === userId) return reply.status(400).send({ message: 'Нельзя использовать свой код' });

  const myData = ensureReferral(userId);
  if (myData.referred_by !== null) return reply.status(400).send({ message: 'Уже активировано' });

  const refData = ensureReferral(referrerId);
  const refs    = JSON.parse(refData.referred_users) as number[];
  refs.push(userId);
  db.prepare('UPDATE referrals SET referred_users=?, total_earned=total_earned+? WHERE user_id=?').run(JSON.stringify(refs), REFERRAL_REWARD, referrerId);
  setBalance(referrerId, getBalance(referrerId) + REFERRAL_REWARD);
  db.prepare('UPDATE referrals SET referred_by=? WHERE user_id=?').run(referrerId, userId);

  return { success: true, reward: REFERRAL_REWARD };
});

// ── Top-up ────────────────────────────────────────────────────────────────────

interface TopupBody { amount: number }

app.post<{ Body: TopupBody }>('/api/balance/topup', {
  schema: { body: { type: 'object', required: ['amount'], properties: { amount: { type: 'number' } } } },
}, async (req, reply) => {
  const userId = getUserId(req);
  const { amount } = req.body;
  const VALID = [500, 1000, 3000, 10000];
  if (!VALID.includes(amount)) return reply.status(400).send({ message: 'Недопустимая сумма' });
  const newBalance = getBalance(userId) + amount;
  setBalance(userId, newBalance);
  return { newBalance };
});

// ── Case open ─────────────────────────────────────────────────────────────────

interface OpenBody { caseId: number }

app.post<{ Body: OpenBody }>('/api/case/open', {
  schema: { body: { type: 'object', required: ['caseId'], properties: { caseId: { type: 'number' } } } },
}, async (req, reply) => {
  const userId    = getUserId(req);
  const { caseId } = req.body;
  const gameCase  = CASES.find(c => c.id === caseId);
  if (!gameCase) return reply.status(404).send({ message: 'Кейс не найден' });

  const balance = getBalance(userId);
  if (balance < gameCase.price) return reply.status(400).send({ message: 'Недостаточно монет' });

  let newBalance = balance - gameCase.price;
  const prize    = pickPrize(PRIZES);

  if (prize.stars) newBalance += prize.stars;
  setBalance(userId, newBalance);

  if (!prize.stars) {
    addHistory(userId, { caseId, caseName: gameCase.name, prize, timestamp: Date.now() });
  }

  return { prize, newBalance };
});

// ── SPA fallback ──────────────────────────────────────────────────────────────

if (isProd) {
  app.setNotFoundHandler((_req, reply) => {
    reply.sendFile('index.html');
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────
try {
  await app.listen({ port: 3001, host: '0.0.0.0' });
  console.log('🚀  http://localhost:3001');
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
