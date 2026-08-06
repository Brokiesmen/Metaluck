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

  // ── Кто я + скользящий refresh токена ─────────────────────────────────────
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

  // ── Явный refresh (тот же Bearer → новый TTL, тот же session_version) ──────
  app.post('/api/auth/refresh', authRateLimit, async (req: FastifyRequest, reply) => {
    const acc = await accountFromRequest(req);
    if (!acc) return jsonError(reply, 401, 'Not authenticated');
    return { token: issueSessionToken(acc), user: publicUser(acc) };
  });

  // ── Google: GIS id_token (не redirect-callback; проверка на сервере) ───────
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

  // ── Telegram Login Widget ─────────────────────────────────────────────────
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

  // ── Logout: bump session_version → все Bearer этого аккаунта инвалидны ────
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
