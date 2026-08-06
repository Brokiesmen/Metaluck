import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  publicUser,
  upsertTelegramAccount,
  upsertGoogleAccount,
  verifyGoogleCredential,
  verifyTelegramLogin,
  accountFromRequest,
  issueSessionToken,
  bumpSessionVersion,
  parseSession,
  bearerToken,
  shouldRefreshSession,
  getAccountById,
} from '../webAuth.js';
import {
  createLoginChallenge,
  claimLoginChallenge,
  telegramBotDeepLink,
  webAppPublicUrl,
} from '../payments/webLogin/telegramChallenge.js';

/**
 * Web-логин (браузер вне Telegram). Bearer в localStorage + Authorization.
 * Cookies не используются (cross-origin API).
 */
export function registerAuthRoutes(app: FastifyInstance): void {
  function jsonError(reply: FastifyReply, code: number, message: string) {
    return reply.status(code).send({ message });
  }

  const authRateLimit = {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
      },
    },
  };

  const pollRateLimit = {
    config: {
      rateLimit: {
        max: 90,
        timeWindow: '1 minute',
      },
    },
  };

  /** Public: что можно показать на экране входа (без секретов). */
  app.get('/api/auth/config', async () => {
    const telegramBot = String(process.env.TELEGRAM_BOT_USERNAME ?? '')
      .trim()
      .replace(/^@/, '');
    const googleClientId = String(process.env.GOOGLE_CLIENT_ID ?? '').trim();
    const botToken = String(process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
    const sessionReady =
      Boolean(String(process.env.SESSION_SECRET ?? '').trim()) ||
      process.env.NODE_ENV !== 'production';
    return {
      telegramBot: telegramBot || null,
      googleClientId: googleClientId || null,
      sessionReady,
      telegramLoginReady: Boolean(telegramBot && botToken && sessionReady),
      googleLoginReady: Boolean(googleClientId && sessionReady),
      webAppUrl: webAppPublicUrl(),
      miniAppPath: String(process.env.TELEGRAM_MINI_APP_PATH ?? 'app').trim() || 'app',
    };
  });

  app.get('/api/auth/me', async (req: FastifyRequest, reply) => {
    const claims = parseSession(bearerToken(req));
    if (!claims) return jsonError(reply, 401, 'Not authenticated');
    const acc = await getAccountById(claims.aid);
    if (!acc || acc.session_version !== claims.sv) {
      return jsonError(reply, 401, 'Not authenticated');
    }
    const body: { user: ReturnType<typeof publicUser>; token?: string } = {
      user: publicUser(acc),
    };
    if (shouldRefreshSession(claims)) {
      body.token = issueSessionToken(acc);
    }
    return body;
  });

  app.post('/api/auth/refresh', authRateLimit, async (req: FastifyRequest, reply) => {
    const acc = await accountFromRequest(req);
    if (!acc) return jsonError(reply, 401, 'Not authenticated');
    return { token: issueSessionToken(acc), user: publicUser(acc) };
  });

  app.post<{ Body: { credential?: string } }>(
    '/api/auth/google',
    {
      ...authRateLimit,
      schema: {
        body: {
          type: 'object',
          required: ['credential'],
          properties: { credential: { type: 'string', minLength: 20, maxLength: 8192 } },
        },
      },
    },
    async (req, reply) => {
      try {
        const credential = String(req.body?.credential ?? '');
        if (!credential) return jsonError(reply, 400, 'Missing credential');
        const g = await verifyGoogleCredential(credential);
        const acc = await upsertGoogleAccount(g);
        return { token: issueSessionToken(acc), user: publicUser(acc) };
      } catch (err) {
        req.log.warn({ err: err instanceof Error ? err.message : err }, '[auth] google failed');
        return jsonError(reply, 401, 'Google authentication failed');
      }
    },
  );

  /** Создать challenge и deep-link t.me/bot?start=web_<id> */
  app.post('/api/auth/telegram/start', {
    config: {
      rateLimit: { max: 10, timeWindow: '1 minute' },
    },
  }, async (req, reply) => {
    try {
      const bot = String(process.env.TELEGRAM_BOT_USERNAME ?? '')
        .trim()
        .replace(/^@/, '');
      const botToken = String(process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
      if (!bot || !botToken) return jsonError(reply, 503, 'Telegram login is not configured');
      const { id, expiresAt } = await createLoginChallenge();
      const deepLink = telegramBotDeepLink(id);
      if (!deepLink) return jsonError(reply, 503, 'Telegram login is not configured');
      return {
        challengeId: id,
        deepLink,
        expiresAt,
        pollIntervalMs: 2000,
      };
    } catch (err) {
      req.log.warn({ err: err instanceof Error ? err.message : err }, '[auth] telegram start failed');
      return jsonError(reply, 500, 'Failed to start Telegram login');
    }
  });

  /** Poll until bot approved the challenge → one-time session. */
  app.get<{ Querystring: { id?: string } }>(
    '/api/auth/telegram/poll',
    pollRateLimit,
    async (req, reply) => {
      try {
        const id = String(req.query?.id ?? '').trim();
        if (!id || id.length > 80) return jsonError(reply, 400, 'Missing challenge id');
        const result = await claimLoginChallenge(id);
        if (result.status === 'pending') return { status: 'pending' as const };
        if (result.status === 'expired') return { status: 'expired' as const };
        return {
          status: 'ready' as const,
          token: result.token,
          user: result.user,
        };
      } catch (err) {
        req.log.warn({ err: err instanceof Error ? err.message : err }, '[auth] telegram poll failed');
        return jsonError(reply, 500, 'Failed to poll Telegram login');
      }
    },
  );

  /** Legacy Telegram Login Widget (optional). */
  app.post<{ Body: Record<string, string | number> }>(
    '/api/auth/telegram',
    {
      ...authRateLimit,
      schema: {
        body: {
          type: 'object',
          required: ['id', 'hash', 'auth_date'],
          additionalProperties: true,
          properties: {
            id: { type: ['number', 'string'] },
            hash: { type: 'string', minLength: 64, maxLength: 64 },
            auth_date: { type: ['number', 'string'] },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const tg = verifyTelegramLogin(req.body ?? {});
        const acc = await upsertTelegramAccount({
          id: tg.id,
          username: tg.username,
          name: tg.name,
          avatar: tg.avatar,
        });
        return { token: issueSessionToken(acc), user: publicUser(acc) };
      } catch (err) {
        req.log.warn({ err: err instanceof Error ? err.message : err }, '[auth] telegram failed');
        return jsonError(reply, 401, 'Telegram authentication failed');
      }
    },
  );

  app.post('/api/auth/logout', authRateLimit, async (req: FastifyRequest) => {
    const claims = parseSession(bearerToken(req));
    if (claims) {
      try {
        await bumpSessionVersion(claims.aid);
      } catch (err) {
        req.log.warn({ err: err instanceof Error ? err.message : err }, '[auth] logout bump failed');
      }
    }
    return { ok: true as const };
  });
}
