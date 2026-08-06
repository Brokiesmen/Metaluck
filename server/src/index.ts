import Fastify, { type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { validateInitData } from './auth.js';
import { registerBlackjackRoutes } from './blackjack.js';
import { registerPvpRoutes } from './pvp.js';
import { registerCoinflipRoutes } from './coinflip.js';
import { registerMineRushRoutes } from './minerush.js';
import { registerArenaRoutes } from './arena.js';
import { registerAviatorRoutes } from './aviator.js';
import { registerRateLimits } from './rateLimit.js';
import {
  requireSupabase,
  getProfile,
  setProfile,
  upsertUserMeta,
  ensureReferral,
} from './supabaseStore.js';
import { httpError } from './routes/helpers.js';
import { activateReferralCode, registerReferralRoutes } from './routes/referrals.js';
import { registerCaseRoutes } from './routes/cases.js';
import { registerDailyRoutes } from './routes/daily.js';
import { registerWheelRoutes } from './routes/wheel.js';
import { registerPaymentsRoutes } from './routes/payments.js';
import { registerWithdrawRoutes } from './routes/withdraw.js';
import { registerWalletRoutes } from './routes/wallet.js';
import { registerDepositRoutes } from './routes/deposit.js';
import { registerExchangeRoutes } from './routes/exchange.js';
import { registerAdminPaymentRoutes } from './routes/adminPayments.js';
import { registerTelegramRoutes } from './routes/telegram.js';
import { startRatesAutoRefresh } from './payments/rates/index.js';
import { getRatesRefreshMs } from './payments/hub/index.js';

requireSupabase();

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

await registerRateLimits(app);

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

registerCaseRoutes(app, { getUserId });
registerDailyRoutes(app, { getUserId });
registerWheelRoutes(app, { getUserId });
registerReferralRoutes(app, { getUserId });
registerPaymentsRoutes(app, { getUserId });
registerWithdrawRoutes(app, { getUserId });
registerWalletRoutes(app, { getUserId });
registerDepositRoutes(app, { getUserId });
registerExchangeRoutes(app, { getUserId });
registerAdminPaymentRoutes(app, { getUserId });
registerTelegramRoutes(app);

startRatesAutoRefresh(await getRatesRefreshMs().catch(() => 60_000));

registerBlackjackRoutes(app, { getUserId });
registerPvpRoutes(app, { getUserId });
registerCoinflipRoutes(app, { getUserId });
registerMineRushRoutes(app, { getUserId });
registerArenaRoutes(app, { getUserId });
await registerAviatorRoutes(app, { getUserId });

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
