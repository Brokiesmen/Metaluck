import Fastify, { type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { PRIZES, PRIZES_CASE1, PRIZES_CASE2, PRIZES_CASE3, CASES, FREE_CASE_INTERVAL_MS } from './data.js';
import { HOUSE_EDGE, applyHouseEdgeStars } from './houseEdge.js';
import { pickPrize } from './random.js';
import { validateInitData } from './auth.js';
import { registerBlackjackRoutes } from './blackjack.js';
import { registerPvpRoutes } from './pvp.js';
import { registerCoinflipRoutes } from './coinflip.js';
import { registerMineRushRoutes } from './minerush.js';
import { registerArenaRoutes } from './arena.js';
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
} from './wheel.js';
import type { Prize } from './types.js';
import {
  requireSupabase,
  getBalance,
  setBalance,
  addBalance,
  addHistory,
  getHistoryPage,
  getLeadersPage,
  getProfile,
  setProfile,
  upsertUserMeta,
  getUserMeta,
  getDailyState,
  setDailyState,
  getLastFreeCaseAt,
  setLastFreeCaseAt,
  getLastWheelAt,
  getCoupons,
  addCouponsLedger,
  trySpendCoupon,
  setTopupOrderMeta,
  getTopupOrderMeta,
  ensureReferral,
  resolveReferrerByCode,
  updateReferralReferrer,
  setReferredBy,
  addReferralEarned,
  insertTopupOrder,
  failTopupOrder,
  getTopupOrderForUser,
  getTopupOrderForCheckout,
  getTopupOrderByPayload,
  claimTopupPaid,
  getReferral,
  parseJsonField,
  tryDeductBalance,
  createWithdrawOrder,
  listWithdrawOrders,
  claimDailyLoginXp,
  upsertBotChat,
  markBotChatBlocked,
  listBroadcastChatIds,
  type ReferralRow,
} from './supabaseStore.js';
import { XP, TASK_IDS } from './xp.js';
import { quietAwardXp, quietClaimTask, quietTryTasks } from './progressAwards.js';

requireSupabase();

const ADMIN_API_SECRET = String(process.env.ADMIN_API_SECRET ?? '').trim();

function miniAppUrl(): string | null {
  const username = String(process.env.TELEGRAM_BOT_USERNAME ?? '').trim().replace(/^@/, '');
  if (!username) return null;
  const pathPart =
    String(process.env.TELEGRAM_MINI_APP_PATH ?? 'app').trim().replace(/^\/+|\/+$/g, '') || 'app';
  return `https://t.me/${username}/${pathPart}`;
}

function verifyAdminSecret(req: FastifyRequest): boolean {
  if (!ADMIN_API_SECRET) return false;
  const got = String(req.headers['x-admin-secret'] ?? '').trim();
  if (!got) return false;
  const a = Buffer.from(got, 'utf8');
  const b = Buffer.from(ADMIN_API_SECRET, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

const TOPUP_PACKAGES = [
  { id: 'xtr_25', xtrAmount: 25, balanceAmount: 25, label: '25 звёзд', popular: false },
  { id: 'xtr_50', xtrAmount: 50, balanceAmount: 50, label: '50 звёзд', popular: true },
  { id: 'xtr_100', xtrAmount: 100, balanceAmount: 100, label: '100 звёзд', popular: false },
  { id: 'xtr_500', xtrAmount: 500, balanceAmount: 500, label: '500 звёзд', popular: false },
] as const;

const PREMIUM_WHEEL_PACKAGE = {
  id: PREMIUM_WHEEL_PACKAGE_ID,
  xtrAmount: PREMIUM_WHEEL_XTR,
  balanceAmount: 0,
  label: 'Премиум фортуна ×1',
  popular: false,
} as const;

const PRE_CHECKOUT_DEADLINE_MS = Math.min(
  9700,
  Math.max(2500, Number(process.env.PRE_CHECKOUT_DEADLINE_MS ?? 9000)),
);
const TELEGRAM_WEBHOOK_SECRET_TOKEN = String(process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN ?? '').trim();

function getTopupPackageById(packageId: string) {
  return TOPUP_PACKAGES.find((p) => p.id === packageId) ?? null;
}

function getInvoicePackageById(packageId: string) {
  if (packageId === PREMIUM_WHEEL_PACKAGE.id) return PREMIUM_WHEEL_PACKAGE;
  return getTopupPackageById(packageId);
}

function buildTopupPayload(userId: number, packageId: string): string {
  const nonce = crypto.randomBytes(6).toString('hex');
  const payload = `mg:1:${userId}:${packageId}:${nonce}`;
  if (payload.length > 128) {
    throw new Error('Invoice payload too long');
  }
  return payload;
}

function parseTopupPayload(payload: string) {
  const parts = String(payload ?? '').split(':');
  if (parts.length !== 5 || parts[0] !== 'mg' || parts[1] !== '1') {
    throw new Error('INVALID_PAYLOAD');
  }
  const userId = Number(parts[2]);
  const packageId = parts[3];
  if (!Number.isFinite(userId) || userId <= 0 || !getInvoicePackageById(packageId)) {
    throw new Error('INVALID_PAYLOAD');
  }
  return { userId, packageId };
}

function telegramApiUrl(method: string): string {
  const token = String(process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function telegramJsonMethod<T = unknown>(
  method: string,
  body: Record<string, unknown>,
  timeoutMs = 7000,
): Promise<T> {
  const res = await fetch(telegramApiUrl(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string; result?: T };
  if (!data.ok) {
    throw new Error(data.description ?? 'Telegram API error');
  }
  return data.result as T;
}

async function createTopupInvoiceLink(
  userId: number,
  pkg: { label: string; balanceAmount: number; xtrAmount: number },
  payload: string,
) {
  const isWheel = pkg.balanceAmount === 0;
  const body: Record<string, unknown> = {
    title: isWheel ? 'Премиум фортуна' : `Пополнение ${pkg.label}`,
    description: isWheel
      ? `1 вращение премиум-колеса за ${pkg.xtrAmount} Telegram Stars.`
      : `Пополнение баланса на ${pkg.balanceAmount} звёзд за ${pkg.xtrAmount} XTR.`,
    payload,
    currency: 'XTR',
    provider_token: '',
    prices: [{ label: pkg.label, amount: pkg.xtrAmount }],
  };
  const photoUrl = String(process.env.STARS_INVOICE_PHOTO_URL ?? '').trim();
  if (photoUrl) {
    body.photo_url = photoUrl;
  }
  return telegramJsonMethod<string>('createInvoiceLink', body);
}

async function answerPreCheckoutQuery(
  preCheckoutQueryId: string,
  ok: boolean,
  opts: { error_message?: string } = {},
) {
  return telegramJsonMethod(
    'answerPreCheckoutQuery',
    {
      pre_checkout_query_id: preCheckoutQueryId,
      ok,
      ...opts,
    },
    5000,
  );
}

function parseRefCode(raw: unknown): string | null {
  const code = String(raw ?? '').trim().toLowerCase();
  if (!/^ref(?:dev|\d{1,20})$/.test(code)) return null;
  return code;
}

function uniqueNumbers(values: unknown[]): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const v of values) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function buildReferralLink(code: string): string | null {
  const username = String(process.env.TELEGRAM_BOT_USERNAME ?? '').trim().replace(/^@/, '');
  if (!username) return null;
  const pathPart = String(process.env.TELEGRAM_MINI_APP_PATH ?? 'app').trim().replace(/^\/+|\/+$/g, '') || 'app';
  return `https://t.me/${username}/${pathPart}?startapp=${encodeURIComponent(code)}`;
}

async function isReferralSignupBonusEligible(userId: number): Promise<boolean> {
  const meta = await getUserMeta(userId);
  if (!meta) return false;
  if (Number(meta.is_premium) === 1) return true;
  const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - Number(meta.first_seen_at) >= MONTH_MS;
}

async function activateReferralCode(
  userId: number,
  rawCode: unknown,
): Promise<{ activated: boolean; rewardGranted?: number; message?: string }> {
  const code = parseRefCode(rawCode);
  if (!code) return { activated: false, message: 'Неверный код' };
  if (userId <= 0) return { activated: false, message: 'Недоступно в dev режиме' };

  const myData = (await ensureReferral(userId)) as ReferralRow;
  if (myData.referred_by !== null) {
    return { activated: false, message: 'Уже активировано' };
  }

  const refData = await resolveReferrerByCode(code);
  if (!refData) {
    return { activated: false, message: 'Код не найден' };
  }
  if (refData.user_id === userId) {
    return { activated: false, message: 'Нельзя использовать свой код' };
  }

  const referredUsersRaw = parseJsonField<unknown[]>(refData.referred_users, []);
  const referredUsers = uniqueNumbers(referredUsersRaw);
  if (!referredUsers.includes(userId)) {
    referredUsers.push(userId);
  }

  const bonus = (await isReferralSignupBonusEligible(userId)) ? REFERRAL_REWARD : 0;
  await updateReferralReferrer(refData.user_id, referredUsers, bonus);
  if (bonus > 0) {
    await addBalance(refData.user_id, bonus);
  }
  await setReferredBy(userId, refData.user_id);
  return { activated: true, rewardGranted: bonus };
}

// ── App ────────────────────────────────────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production';
const app = Fastify({ logger: { level: 'info' } });

const corsOrigins = String(process.env.CORS_ORIGIN ?? '')
  .split(/[,\s]+/)
  .map((s) => s.trim())
  .filter(Boolean);

await app.register(cors, {
  origin: (origin, cb) => {
    if (corsOrigins.length > 0) {
      cb(null, !origin || corsOrigins.includes(origin));
      return;
    }
    // Allow Telegram WebView, Vercel previews, and same-origin (no Origin header)
    cb(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Telegram-Init-Data',
    'X-Requested-With',
    'Accept',
  ],
  credentials: false,
  preflight: true,
  strictPreflight: false,
});

app.get('/api/health', async () => ({ ok: true as const, ts: Date.now() }));

function isApiPath(url: string): boolean {
  const p = url.split('?')[0] ?? '';
  return p === '/api' || p.startsWith('/api/');
}

app.setErrorHandler((error: Error & { statusCode?: number; validation?: unknown }, request, reply) => {
  if (!isApiPath(request.url)) {
    reply.send(error);
    return;
  }
  const statusCode =
    error.statusCode ??
    (error.message === 'Unauthorized' ? 401 : error.validation ? 400 : 500);
  const payload: { message: string; code?: string } = {
    message: error.message || 'Server error',
  };
  if (error.validation) {
    payload.code = 'VALIDATION_ERROR';
  }
  reply
    .status(statusCode)
    .type('application/json; charset=utf-8')
    .send(payload);
});

app.addHook('onSend', (request, reply, payload, done) => {
  try {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'SAMEORIGIN');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    const url = request.url ?? '';
    if (url === '/' || url.endsWith('.html')) {
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
    }
    if (/\/assets\/.*-[a-f0-9]{8,}\.(js|css|woff2?|png|webp|jpg)$/.test(url)) {
      reply.header('Cache-Control', 'public, max-age=31536000, immutable');
    }
    done(null, payload);
  } catch (err) {
    done(err as Error);
  }
});

const DAILY_REWARDS = [
  { day: 1, type: 'stars' as const, stars: 1 },
  { day: 2, type: 'stars' as const, stars: 1 },
  { day: 3, type: 'stars' as const, stars: 1 },
  { day: 4, type: 'stars' as const, stars: 1 },
  { day: 5, type: 'gift' as const, rarity: 'blue' as const },
  { day: 6, type: 'stars' as const, stars: 1 },
  { day: 7, type: 'gift' as const, rarity: 'purple' as const },
];

const REFERRAL_REWARD = 3;
const REFERRAL_CASHBACK_PERCENT = 10;

interface HistoryEntry {
  caseId: number;
  caseName: string;
  prize: Prize;
  timestamp: number;
}

function httpError(statusCode: number, message: string): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode });
}

async function getUserId(req: FastifyRequest): Promise<number> {
  const raw = req.headers['x-telegram-init-data'] as string | undefined;
  const result = validateInitData(raw);
  if (!result.valid) throw httpError(401, 'Unauthorized');

  if (result.user && result.userId) {
    const fn = (result.user.first_name as string) || '';
    const ln = (result.user.last_name as string) || '';
    const name = `${fn} ${ln}`.trim();
    const photoUrl = (result.user.photo_url as string) || undefined;
    const isPremium = Boolean(result.user.is_premium);
    await upsertUserMeta(result.userId, isPremium);
    if (name) {
      const existing = await getProfile(result.userId);
      if (!existing || existing.name !== name || existing.photo_url !== photoUrl) {
        await setProfile(result.userId, name, photoUrl);
      }
    }
  } else if (result.userId === 0 && !(await getProfile(0))) {
    await setProfile(0, 'Dev User');
  }

  if (result.userId > 0) {
    await ensureReferral(result.userId);
    if (result.startParam) {
      await activateReferralCode(result.userId, result.startParam);
    }
  }

  return result.userId;
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/api/balance', async (req) => {
  const userId = await getUserId(req);
  return { balance: await getBalance(userId) };
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

// ── Daily reward ──────────────────────────────────────────────────────────────
const MS_24H = 24 * 60 * 60 * 1000;

/** Next calendar day in the 1→7→1 loop (no streak break). */
function nextDailyDay(claimedDay: number): number {
  if (!claimedDay || claimedDay < 1) return 1;
  return claimedDay >= 7 ? 1 : claimedDay + 1;
}

app.get('/api/daily/status', async (req) => {
  const userId = await getUserId(req);
  const state = (await getDailyState(userId)) ?? { claimed_day: 0, last_claim_at: 0 };
  const now = Date.now();
  const elapsed = state.last_claim_at > 0 ? now - state.last_claim_at : Number.POSITIVE_INFINITY;

  let currentDay: number;
  let canClaim: boolean;
  let nextClaimAt = 0;
  let claimedDays: boolean[];

  if (!state.last_claim_at || state.claimed_day <= 0) {
    currentDay = 1;
    canClaim = true;
    claimedDays = Array.from({ length: 7 }, () => false);
  } else if (elapsed < MS_24H) {
    // Cooldown after claim — highlight the upcoming day.
    currentDay = nextDailyDay(state.claimed_day);
    canClaim = false;
    nextClaimAt = state.last_claim_at + MS_24H;
    claimedDays = Array.from({ length: 7 }, (_, i) => i < state.claimed_day);
  } else {
    // Ready to claim the next day in sequence (wraps 7 → 1).
    currentDay = nextDailyDay(state.claimed_day);
    canClaim = true;
    // New cycle after day 7: clear checkmarks so the calendar starts fresh.
    claimedDays =
      state.claimed_day >= 7
        ? Array.from({ length: 7 }, () => false)
        : Array.from({ length: 7 }, (_, i) => i < state.claimed_day);
  }

  return { currentDay, canClaim, nextClaimAt, claimedDays };
});

app.post('/api/daily/claim', { schema: { body: { type: 'object' } } }, async (req, reply) => {
  const userId = await getUserId(req);
  const state = (await getDailyState(userId)) ?? { claimed_day: 0, last_claim_at: 0 };
  const now = Date.now();
  const elapsed = state.last_claim_at > 0 ? now - state.last_claim_at : Number.POSITIVE_INFINITY;

  if (state.last_claim_at && elapsed < MS_24H) {
    return reply.status(400).send({ message: 'Уже забрано сегодня' });
  }

  const dayToClaim = nextDailyDay(state.claimed_day);

  const reward = DAILY_REWARDS[dayToClaim - 1];
  let prize: Prize;
  let newBalance = await getBalance(userId);

  if (reward.type === 'stars') {
    const stars = reward.stars!;
    newBalance += stars;
    await setBalance(userId, newBalance);
    prize = { id: 900 + dayToClaim, name: `${stars} звёзд`, rarity: 'gold', icon: '⭐', stars };
  } else {
    const rarity = reward.rarity;
    let giftPool = PRIZES.filter((p) => !p.stars && !p.isPremium && p.rarity === rarity);
    if (giftPool.length === 0) {
      giftPool = PRIZES.filter((p) => !p.stars && !p.isPremium);
    }
    prize = giftPool[Math.floor(Math.random() * giftPool.length)];
    await addHistory(userId, {
      caseId: 1,
      caseName: `Ежедневный подарок (день ${dayToClaim})`,
      prize,
      timestamp: now,
    } satisfies HistoryEntry);
  }

  await setDailyState(userId, dayToClaim, now);
  await quietAwardXp(userId, XP.DAILY_CLAIM(dayToClaim));
  await quietClaimTask(userId, TASK_IDS.CLAIM_DAILY);
  return { prize, newBalance, day: dayToClaim };
});

// ── Free Wheel of Fortune (once / 7 days) ─────────────────────────────────────

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
  let newBalance = await getBalance(userId);

  if (built.prize.stars && built.prize.stars > 0) {
    newBalance += built.prize.stars;
    await setBalance(userId, newBalance);
  }

  let coupons = await getCoupons(userId, COUPON_LEDGER_CASE_ID);
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
    newBalance = await getBalance(userId);
  }

  return {
    prize: built.prize,
    newBalance,
    coupons,
    segmentIndex: built.segmentIndex,
    empty: built.empty,
  };
}

app.get('/api/wheel/status', async (req) => {
  const userId = await getUserId(req);
  const now = Date.now();
  const lastAt = await getLastWheelAt(userId, WHEEL_CASE_ID);
  const available = now - lastAt >= WHEEL_INTERVAL_MS;
  const coupons = await getCoupons(userId, COUPON_LEDGER_CASE_ID);
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

  const pkg = PREMIUM_WHEEL_PACKAGE;
  const payload = buildTopupPayload(userId, pkg.id);
  const now = Date.now();
  await insertTopupOrder({
    payload,
    user_id: userId,
    package_id: pkg.id,
    xtr_amount: pkg.xtrAmount,
    balance_amount: pkg.balanceAmount,
    created_at: now,
    updated_at: now,
  });

  try {
    const invoiceLink = await createTopupInvoiceLink(userId, pkg, payload);
    return { invoiceLink, payload, xtrAmount: pkg.xtrAmount };
  } catch (err) {
    await failTopupOrder(payload, err instanceof Error ? err.message : 'INVOICE_CREATE_FAILED');
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

// ── Referral ──────────────────────────────────────────────────────────────────

app.get('/api/referral/status', async (req) => {
  const userId = await getUserId(req);
  const data = await ensureReferral(userId);
  const refs = uniqueNumbers(parseJsonField<unknown[]>(data.referred_users, []));
  return {
    code: data.code,
    link: buildReferralLink(data.code),
    referredBy: data.referred_by,
    referredCount: refs.length,
    totalEarned: data.total_earned,
    rewardPerInvite: REFERRAL_REWARD,
    cashbackPercent: REFERRAL_CASHBACK_PERCENT,
  };
});

interface ActivateBody {
  code: string;
}

app.post<{ Body: ActivateBody }>(
  '/api/referral/activate',
  {
    schema: {
      body: { type: 'object', required: ['code'], properties: { code: { type: 'string' } } },
    },
  },
  async (req, reply) => {
    const userId = await getUserId(req);
    const result = await activateReferralCode(userId, req.body.code);
    if (!result.activated) {
      return reply.status(400).send({ message: result.message ?? 'Не удалось активировать код' });
    }
    return { success: true, reward: result.rewardGranted ?? 0 };
  },
);

// ── Top-up ────────────────────────────────────────────────────────────────────

app.get('/api/topup/packages', async () => ({
  packages: TOPUP_PACKAGES,
}));

interface CreateInvoiceBody {
  packageId: string;
}

app.post<{ Body: CreateInvoiceBody }>(
  '/api/topup/create-invoice',
  {
    schema: {
      body: {
        type: 'object',
        required: ['packageId'],
        properties: { packageId: { type: 'string' } },
      },
    },
  },
  async (req, reply) => {
    const userId = await getUserId(req);
    if (userId <= 0) {
      return reply.status(400).send({ message: 'Оплата доступна только внутри Telegram Mini App.' });
    }

    const pkg = getTopupPackageById(req.body.packageId);
    if (!pkg) {
      return reply.status(400).send({ message: 'Неизвестный пакет пополнения.' });
    }

    const payload = buildTopupPayload(userId, pkg.id);
    const now = Date.now();
    await insertTopupOrder({
      payload,
      user_id: userId,
      package_id: pkg.id,
      xtr_amount: pkg.xtrAmount,
      balance_amount: pkg.balanceAmount,
      created_at: now,
      updated_at: now,
    });

    try {
      const invoiceLink = await createTopupInvoiceLink(userId, pkg, payload);
      return { invoiceLink, payload };
    } catch (err) {
      await failTopupOrder(
        payload,
        err instanceof Error ? err.message : 'INVOICE_CREATE_FAILED',
      );
      return reply.status(500).send({ message: 'Не удалось создать счёт. Попробуйте ещё раз.' });
    }
  },
);

app.get<{ Params: { payload: string } }>('/api/topup/status/:payload', async (req, reply) => {
  const userId = await getUserId(req);
  const row = await getTopupOrderForUser(req.params.payload, userId);

  if (!row) {
    return reply.status(404).send({ message: 'Платёж не найден' });
  }

  return {
    status: row.status,
    balanceAmount: row.balance_amount,
    newBalance: row.status === 'paid' ? await getBalance(userId) : null,
  };
});

// ── Withdraw ──────────────────────────────────────────────────────────────────

const MIN_WITHDRAW = 100;
const WITHDRAW_PRESETS = [100, 250, 500, 1000, 5000] as const;

app.get('/api/withdraw/info', async (req) => {
  const userId = await getUserId(req);
  const balance = await getBalance(userId);
  const recent = userId > 0 ? await listWithdrawOrders(userId, 5) : [];
  return {
    balance,
    minAmount: MIN_WITHDRAW,
    presets: WITHDRAW_PRESETS,
    recent,
  };
});

app.post<{ Body: { amount?: number } }>(
  '/api/withdraw/create',
  {
    schema: {
      body: {
        type: 'object',
        required: ['amount'],
        properties: { amount: { type: 'number' } },
      },
    },
  },
  async (req, reply) => {
    const userId = await getUserId(req);
    if (userId <= 0) {
      return reply.status(400).send({ message: 'Вывод доступен только внутри Telegram Mini App.' });
    }

    const amount = Math.floor(Number(req.body?.amount));
    if (!Number.isFinite(amount) || amount < MIN_WITHDRAW) {
      return reply.status(400).send({ message: `Минимальная сумма вывода — ${MIN_WITHDRAW} ★` });
    }

    const newBalance = await tryDeductBalance(userId, amount);
    if (newBalance === null) {
      return reply.status(400).send({ message: 'Недостаточно звёзд на балансе' });
    }

    const profile = await getProfile(userId);
    const rawInit = req.headers['x-telegram-init-data'] as string | undefined;
    const validated = validateInitData(rawInit);
    const username =
      validated.valid && validated.user?.username
        ? String(validated.user.username)
        : null;

    let order;
    try {
      order = await createWithdrawOrder({
        user_id: userId,
        amount,
        username,
        display_name: profile?.name ?? null,
      });
    } catch (err) {
      await addBalance(userId, amount);
      throw err;
    }

    const adminChat = String(process.env.TELEGRAM_ADMIN_CHAT_ID ?? '').trim();
    if (adminChat) {
      const who = username ? `@${username}` : (profile?.name ?? `id ${userId}`);
      telegramJsonMethod('sendMessage', {
        chat_id: adminChat,
        text: `💸 Заявка на вывод #${order.id}\n${who}\nСумма: ${amount} ★\nuser_id: ${userId}`,
      }).catch(() => {});
    }

    return {
      ok: true,
      orderId: order.id,
      amount: order.amount,
      status: order.status,
      newBalance,
    };
  },
);

// ── Case open ─────────────────────────────────────────────────────────────────

interface OpenBody {
  caseId: number;
}

app.post<{ Body: OpenBody }>(
  '/api/case/open',
  {
    schema: {
      body: { type: 'object', required: ['caseId'], properties: { caseId: { type: 'number' } } },
    },
  },
  async (req, reply) => {
    const userId = await getUserId(req);
    const { caseId } = req.body;
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

    const balance = await getBalance(userId);
    if (balance < cost) return reply.status(400).send({ message: 'Недостаточно звёзд' });

    let newBalance = balance - cost;

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

    if (Math.random() < rerollChance) {
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

    if (prize.stars) {
      const credited = applyHouseEdgeStars(prize.stars);
      newBalance += credited;
      prize = { ...prize, stars: credited, name: `${credited} звёзд` };
    }
    await setBalance(userId, newBalance);
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
  },
);

registerBlackjackRoutes(app, { getUserId, getBalance, setBalance });
registerPvpRoutes(app, { getUserId });
registerCoinflipRoutes(app, { getUserId, getBalance, setBalance });
registerMineRushRoutes(app, { getUserId, getBalance, setBalance });
registerArenaRoutes(app, { getUserId, getBalance });

// ── Telegram webhook for Stars payments ───────────────────────────────────────
function verifyWebhookSecret(req: FastifyRequest): boolean {
  if (!TELEGRAM_WEBHOOK_SECRET_TOKEN) return true;
  const got = String(req.headers['x-telegram-bot-api-secret-token'] ?? '').trim();
  const expected = TELEGRAM_WEBHOOK_SECRET_TOKEN;
  const a = Buffer.from(got, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function evaluatePreCheckoutQuery(q: any) {
  const fromId = Number(q?.from?.id);
  if (!Number.isFinite(fromId) || fromId <= 0) {
    return { ok: false as const, error_message: 'Не удалось определить покупателя.' };
  }
  if (q?.currency !== 'XTR') {
    return { ok: false as const, error_message: 'Поддерживаются только Telegram Stars (XTR).' };
  }

  const payload = String(q?.invoice_payload ?? '');
  let parsed: { userId: number; packageId: string };
  try {
    parsed = parseTopupPayload(payload);
  } catch {
    return { ok: false as const, error_message: 'Некорректный счёт. Запросите новый.' };
  }
  if (parsed.userId !== fromId) {
    return { ok: false as const, error_message: 'Счёт выписан для другого пользователя.' };
  }

  const row = await getTopupOrderForCheckout(payload, fromId);

  if (!row || row.status !== 'pending') {
    return { ok: false as const, error_message: 'Счёт не найден или уже обработан.' };
  }
  if (row.package_id !== parsed.packageId || Number(q.total_amount) !== row.xtr_amount) {
    return { ok: false as const, error_message: 'Сумма счёта не совпадает с пакетом.' };
  }
  return { ok: true as const };
}

async function handlePreCheckoutQuery(q: any) {
  const qid = String(q?.id ?? '');
  if (!qid) return;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<{ kind: 'timeout' }>((resolve) => {
    timer = setTimeout(() => resolve({ kind: 'timeout' }), PRE_CHECKOUT_DEADLINE_MS);
  });
  const evalPromise = evaluatePreCheckoutQuery(q).then(
    (evaluation) => ({ kind: 'eval' as const, evaluation }),
    (err) => ({ kind: 'error' as const, err }),
  );

  const winner = await Promise.race([timeoutPromise, evalPromise]);
  if (timer) clearTimeout(timer);

  if (winner.kind === 'timeout') {
    await answerPreCheckoutQuery(qid, false, {
      error_message: 'Не удалось подтвердить заказ вовремя. Попробуйте снова.',
    }).catch(() => undefined);
    return;
  }
  if (winner.kind === 'error') {
    await answerPreCheckoutQuery(qid, false, { error_message: 'Ошибка проверки заказа.' }).catch(
      () => undefined,
    );
    return;
  }
  if (!winner.evaluation.ok) {
    await answerPreCheckoutQuery(qid, false, {
      error_message: winner.evaluation.error_message,
    }).catch(() => undefined);
    return;
  }
  await answerPreCheckoutQuery(qid, true).catch(() => undefined);
}

async function applySuccessfulPayment(sp: any, payerTelegramId: number) {
  const payload = String(sp?.invoice_payload ?? '');
  const chargeId = String(sp?.telegram_payment_charge_id ?? '');
  const providerChargeId = sp?.provider_payment_charge_id ? String(sp.provider_payment_charge_id) : null;
  const totalAmount = Number(sp?.total_amount);
  const currency = String(sp?.currency ?? '');
  if (!payload || !chargeId || currency !== 'XTR' || !Number.isFinite(totalAmount) || totalAmount <= 0) {
    return;
  }

  let parsed: { userId: number; packageId: string };
  try {
    parsed = parseTopupPayload(payload);
  } catch {
    return;
  }
  if (parsed.userId !== payerTelegramId) {
    return;
  }

  const order = await getTopupOrderByPayload(payload);
  if (!order) return;
  if (order.status === 'paid') return;
  if (order.user_id !== payerTelegramId) return;
  if (order.package_id !== parsed.packageId || order.xtr_amount !== totalAmount) return;

  // Claim first so concurrent webhooks cannot double-credit.
  const claimed = await claimTopupPaid(payload, chargeId, providerChargeId);
  if (!claimed) return;

  if (claimed.package_id === PREMIUM_WHEEL_PACKAGE_ID) {
    // Marks a paid premium spin credit — client calls /api/wheel/premium/spin { method: 'xtr' }
    await setTopupOrderMeta(payload, 'premium_spin_credit');
    return;
  }

  await addBalance(claimed.user_id, claimed.balance_amount);

  const referral = await getReferral(claimed.user_id);
  const inviterId = Number(referral?.referred_by ?? 0);
  const cashback = inviterId > 0 ? Math.floor((claimed.balance_amount * REFERRAL_CASHBACK_PERCENT) / 100) : 0;
  if (cashback > 0) {
    await ensureReferral(inviterId);
    await addBalance(inviterId, cashback);
    await addReferralEarned(inviterId, cashback);
  }
}

app.get('/api/telegram/webhook', async () => ({
  ok: true,
  hint: 'Telegram sends POST updates here.',
}));

async function handleBotStartMessage(message: any) {
  const chat = message?.chat;
  const from = message?.from;
  const chatId = Number(chat?.id);
  const userId = Number(from?.id);
  if (!Number.isFinite(chatId) || chatId === 0 || !Number.isFinite(userId) || userId <= 0) return;
  if (chat?.type && chat.type !== 'private') return;

  await upsertBotChat({
    chatId,
    userId,
    username: from?.username ?? null,
    firstName: from?.first_name ?? null,
  }).catch((err) => {
    console.warn('[bot_chats] upsert failed', err);
  });

  const appUrl = miniAppUrl();
  const name = String(from?.first_name ?? '').trim() || 'друг';
  const text =
    `Привет, ${name}! 👋\n\n` +
    `Добро пожаловать в <b>Metaluck</b> — кейсы, мини-игры и Stars.\n` +
    `Нажми кнопку ниже, чтобы открыть приложение.`;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };
  if (appUrl) {
    body.reply_markup = {
      inline_keyboard: [[{ text: '🎮 Играть', url: appUrl }]],
    };
  }
  await telegramJsonMethod('sendMessage', body).catch((err) => {
    console.warn('[bot] welcome send failed', err);
  });
}

async function handleMyChatMember(update: any) {
  const chatId = Number(update?.chat?.id);
  const status = String(update?.new_chat_member?.status ?? '');
  if (!Number.isFinite(chatId) || chatId === 0) return;
  if (status === 'kicked' || status === 'left') {
    await markBotChatBlocked(chatId, true).catch(() => undefined);
  } else if (status === 'member' || status === 'restricted') {
    await markBotChatBlocked(chatId, false).catch(() => undefined);
  }
}

app.post('/api/telegram/webhook', async (req, reply) => {
  if (!verifyWebhookSecret(req)) {
    return reply.status(403).send({ message: 'Invalid webhook secret' });
  }

  const update = (req.body ?? {}) as any;
  if (update.pre_checkout_query) {
    await handlePreCheckoutQuery(update.pre_checkout_query);
    return reply.send({ ok: true });
  }
  if (update.message?.successful_payment) {
    const payerId = Number(update.message?.from?.id);
    if (Number.isFinite(payerId) && payerId > 0) {
      await applySuccessfulPayment(update.message.successful_payment, payerId);
    }
    return reply.send({ ok: true });
  }

  const text = String(update.message?.text ?? '').trim();
  if (text === '/start' || text.startsWith('/start ')) {
    await handleBotStartMessage(update.message);
    return reply.send({ ok: true });
  }
  if (update.my_chat_member) {
    await handleMyChatMember(update.my_chat_member);
    return reply.send({ ok: true });
  }
  return reply.send({ ok: true });
});

/** Admin broadcast to everyone who pressed /start. Header: x-admin-secret */
app.post('/api/admin/broadcast', async (req, reply) => {
  if (!verifyAdminSecret(req)) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }
  const body = (req.body ?? {}) as { text?: string; button?: string; dryRun?: boolean; limit?: number };
  const text = String(body.text ?? '').trim();
  if (!text || text.length > 3900) {
    return reply.status(400).send({ message: 'text required (1–3900 chars)' });
  }
  const dryRun = Boolean(body.dryRun);
  const buttonLabel = String(body.button ?? 'Играть').trim() || 'Играть';
  const limit = Math.min(20_000, Math.max(1, Number(body.limit) || 5000));
  const chatIds = await listBroadcastChatIds(limit);
  const appUrl = miniAppUrl();
  const replyMarkup = appUrl
    ? { inline_keyboard: [[{ text: buttonLabel, url: appUrl }]] }
    : undefined;

  if (dryRun) {
    return reply.send({ ok: true, dryRun: true, recipients: chatIds.length });
  }

  let sent = 0;
  let failed = 0;
  let blocked = 0;
  for (const chatId of chatIds) {
    try {
      await telegramJsonMethod('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: replyMarkup,
      });
      sent += 1;
    } catch (err) {
      failed += 1;
      const msg = String((err as Error)?.message ?? err);
      if (/blocked|deactivated|chat not found|Forbidden/i.test(msg)) {
        blocked += 1;
        await markBotChatBlocked(chatId, true).catch(() => undefined);
      }
    }
    await new Promise((r) => setTimeout(r, 40));
  }
  return reply.send({ ok: true, recipients: chatIds.length, sent, failed, blocked });
});

if (isProd && process.env.SERVE_CLIENT === '1') {
  const clientDist = path.join(__dirname, '../../client/dist');
  await app.register(staticFiles, { root: clientDist, prefix: '/' });
}

app.setNotFoundHandler((request, reply) => {
  if (isApiPath(request.url)) {
    return reply.status(404).type('application/json; charset=utf-8').send({ message: 'Not Found' });
  }
  if (isProd && process.env.SERVE_CLIENT === '1') {
    return reply.sendFile('index.html');
  }
  return reply.status(404).type('application/json; charset=utf-8').send({ message: 'Not Found' });
});

const PORT = Number(process.env.PORT) || 3001;
try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`🚀  http://localhost:${PORT} (Supabase persistence)`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
