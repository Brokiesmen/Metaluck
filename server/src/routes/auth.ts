import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  publicUser,
  upsertTelegramAccount,
  upsertGoogleAccount,
  upsertWalletAccount,
  upsertDevLocalAccount,
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
import { validateInitData } from '../auth.js';
import {
  createLoginWalletChallenge,
  consumeLoginWalletChallenge,
} from '../payments/walletLink/store.js';
import { verifyTonProof, type TonProofPayload } from '../payments/walletLink/tonProof.js';
import {
  verifyEvmProof,
  buildEvmLoginMessage,
  type EvmProofPayload,
} from '../payments/walletLink/siwe.js';

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

  function isDevLoginAllowed(): boolean {
    return process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_LOGIN === '1';
  }

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
    const walletConnectProjectId = String(process.env.WALLETCONNECT_PROJECT_ID ?? '').trim();
    const webUrl = webAppPublicUrl();
    return {
      telegramBot: telegramBot || null,
      googleClientId: googleClientId || null,
      sessionReady,
      telegramLoginReady: Boolean(telegramBot && botToken && sessionReady),
      googleLoginReady: Boolean(googleClientId && sessionReady),
      webAppUrl: webUrl,
      miniAppPath: String(process.env.TELEGRAM_MINI_APP_PATH ?? 'app').trim() || 'app',
      // Привязка внешних кошельков + вход через кошелёк:
      tonManifestUrl: webUrl ? `${webUrl}/tonconnect-manifest.json` : null,
      walletConnectProjectId: walletConnectProjectId || null,
      walletLink: { ton: true, evm: Boolean(walletConnectProjectId) },
      tonLoginReady: Boolean(sessionReady),
      evmLoginReady: Boolean(sessionReady), // MetaMask / injected; WC modal needs projectId
      walletConnectReady: Boolean(walletConnectProjectId && sessionReady),
      /** Локальный вход без OAuth — только вне production (или ALLOW_DEV_LOGIN=1). */
      devLoginReady: isDevLoginAllowed() && sessionReady,
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

  /** Локальный вход для UI-правки (телефон по LAN / без OAuth). Недоступен в production. */
  app.post('/api/auth/dev', authRateLimit, async (req, reply) => {
    if (!isDevLoginAllowed()) return jsonError(reply, 404, 'Not found');
    try {
      const acc = await upsertDevLocalAccount();
      return { token: issueSessionToken(acc), user: publicUser(acc) };
    } catch (err) {
      req.log.warn({ err: err instanceof Error ? err.message : err }, '[auth] dev login failed');
      return jsonError(reply, 500, 'Dev login failed');
    }
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

  /** Публичный nonce для входа через TON / EVM (без сессии). */
  app.get<{ Querystring: { chain?: string } }>(
    '/api/auth/wallet/challenge',
    authRateLimit,
    async (req, reply) => {
      const chain = String(req.query?.chain ?? '').trim();
      if (chain !== 'ton' && chain !== 'evm') return jsonError(reply, 400, 'bad chain');
      try {
        const { nonce, expiresAt } = await createLoginWalletChallenge(chain);
        return { nonce, expiresAt, chain };
      } catch (err) {
        req.log.warn({ err: err instanceof Error ? err.message : err }, '[auth] wallet challenge failed');
        return jsonError(reply, 500, 'Failed to create wallet challenge');
      }
    },
  );

  /** Текст для personal_sign при входе через EVM. */
  app.get<{ Querystring: { address?: string; nonce?: string } }>(
    '/api/auth/wallet/evm/message',
    authRateLimit,
    async (req, reply) => {
      const address = String(req.query?.address ?? '').trim();
      const nonce = String(req.query?.nonce ?? '').trim();
      if (!address || !nonce) return jsonError(reply, 400, 'missing params');
      const domain = (() => {
        try {
          return new URL(String(process.env.WEB_APP_URL ?? 'https://metaluck-eight.vercel.app')).host;
        } catch {
          return 'metaluck-eight.vercel.app';
        }
      })();
      return {
        message: buildEvmLoginMessage({
          address,
          nonce,
          domain,
          issuedAt: new Date().toISOString(),
        }),
      };
    },
  );

  /** Вход через TON Connect ton_proof. */
  app.post<{ Body: TonProofPayload }>('/api/auth/ton', authRateLimit, async (req, reply) => {
    try {
      const body = req.body;
      const nonce = String(body?.proof?.payload ?? '');
      if (!(await consumeLoginWalletChallenge(nonce, 'ton'))) {
        return jsonError(reply, 400, 'invalid or expired challenge');
      }
      const verified = await verifyTonProof(body);
      const acc = await upsertWalletAccount({
        chain: 'ton',
        address: verified.addressRaw,
        addressDisplay: verified.addressFriendly,
        publicKey: verified.publicKey,
      });
      return { token: issueSessionToken(acc), user: publicUser(acc) };
    } catch (err) {
      req.log.warn({ err: err instanceof Error ? err.message : err }, '[auth] ton failed');
      return jsonError(reply, 401, 'TON authentication failed');
    }
  });

  /** Вход через EVM (MetaMask / WalletConnect personal_sign). */
  app.post<{ Body: EvmProofPayload }>('/api/auth/evm', authRateLimit, async (req, reply) => {
    try {
      const body = req.body;
      const nonce = String(body?.nonce ?? '');
      if (!(await consumeLoginWalletChallenge(nonce, 'evm'))) {
        return jsonError(reply, 400, 'invalid or expired challenge');
      }
      const verified = await verifyEvmProof(body);
      const acc = await upsertWalletAccount({
        chain: 'evm',
        address: verified.address,
        addressDisplay: verified.addressDisplay,
      });
      return { token: issueSessionToken(acc), user: publicUser(acc) };
    } catch (err) {
      req.log.warn({ err: err instanceof Error ? err.message : err }, '[auth] evm failed');
      return jsonError(reply, 401, 'Wallet authentication failed');
    }
  });

  /**
   * Telegram Mini App: обмен подписанного initData на web-сессию (Bearer).
   * Валидирует HMAC (bot token), создаёт/обновляет accounts-запись, выдаёт токен.
   * Позволяет Mini App-пользователю работать в общем UI-слое как web-сессия.
   */
  app.post<{ Body: { initData?: string } }>(
    '/api/auth/telegram/initdata',
    {
      ...authRateLimit,
      schema: {
        body: {
          type: 'object',
          required: ['initData'],
          properties: { initData: { type: 'string', minLength: 1, maxLength: 8192 } },
        },
      },
    },
    async (req, reply) => {
      try {
        const initData = String(req.body?.initData ?? '');
        const result = validateInitData(initData);
        if (!result.valid || !result.user || !(result.userId > 0)) {
          return jsonError(reply, 401, 'Invalid Telegram init data');
        }
        const u = result.user;
        const first = String(u.first_name ?? '').trim();
        const last = String(u.last_name ?? '').trim();
        const name = [first, last].filter(Boolean).join(' ') || null;
        const acc = await upsertTelegramAccount({
          id: result.userId,
          username: u.username ? String(u.username) : null,
          name,
          avatar: u.photo_url ? String(u.photo_url) : null,
        });
        return { token: issueSessionToken(acc), user: publicUser(acc) };
      } catch (err) {
        req.log.warn({ err: err instanceof Error ? err.message : err }, '[auth] telegram initData failed');
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
