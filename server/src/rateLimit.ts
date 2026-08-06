import type { FastifyInstance, FastifyRequest } from 'fastify';
import rateLimit from '@fastify/rate-limit';

/** Best-effort Telegram user id from initData (no HMAC) for rate-limit keys. */
export function rateLimitUserKey(req: FastifyRequest): string {
  const raw = String(req.headers['x-telegram-init-data'] ?? '');
  if (raw) {
    try {
      const userStr = new URLSearchParams(raw).get('user');
      if (userStr) {
        const user = JSON.parse(userStr) as { id?: unknown };
        if (typeof user.id === 'number' && Number.isFinite(user.id)) {
          return `tg:${user.id}`;
        }
      }
    } catch {
      /* fall through */
    }
  }
  return `ip:${req.ip}`;
}

const PAID_OR_GAME =
  /^\/api\/(case\/open|wheel\/(spin|premium\/spin)|coinflip\/play|blackjack\/(deal|hit|stand|double)|minerush\/(start|reveal|cashout)|arena\/|aviator\/|daily\/claim|withdraw\/create|topup\/|deposit\/|exchange\/)/;

export async function registerRateLimits(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    global: true,
    max: 180,
    timeWindow: '1 minute',
    keyGenerator: rateLimitUserKey,
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Слишком много запросов. Подождите ${Math.ceil(context.ttl / 1000)} с.`,
    }),
  });

  app.addHook('onRoute', (routeOptions) => {
    const url = String(routeOptions.url ?? '');
    if (!PAID_OR_GAME.test(url)) return;
    routeOptions.config = {
      ...routeOptions.config,
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
        keyGenerator: rateLimitUserKey,
      },
    };
  });
}
