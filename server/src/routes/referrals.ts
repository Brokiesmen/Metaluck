import type { FastifyInstance } from 'fastify';
import {
  ensureReferral,
  getUserMeta,
  parseJsonField,
  resolveReferrerByCode,
  setReferredBy,
  updateReferralReferrer,
  type ReferralRow,
} from '../supabaseStore.js';
import type { GetUserId } from './helpers.js';
import { CreditWinnings } from '../payments/wallet/game.js';

export const REFERRAL_REWARD = 3;
export const REFERRAL_CASHBACK_PERCENT = 10;

function parseRefCode(raw: unknown): string | null {
  const code = String(raw ?? '').trim().toLowerCase();
  if (!/^ref(?:dev|\d{1,20})$/.test(code)) return null;
  return code;
}

export function uniqueNumbers(values: unknown[]): number[] {
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

export async function activateReferralCode(
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
    await CreditWinnings(refData.user_id, bonus, {
      game: 'referral',
      refId: String(userId),
      idempotencyKey: `referral:${refData.user_id}:${userId}`,
    });
  }
  await setReferredBy(userId, refData.user_id);
  return { activated: true, rewardGranted: bonus };
}

interface ActivateBody {
  code: string;
}

export function registerReferralRoutes(app: FastifyInstance, deps: { getUserId: GetUserId }) {
  const { getUserId } = deps;

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
}
