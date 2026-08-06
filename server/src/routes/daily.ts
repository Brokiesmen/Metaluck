import type { FastifyInstance } from 'fastify';
import { PRIZES } from '../data.js';
import { pickOne } from '../random.js';
import { quietAwardXp, quietClaimTask } from '../progressAwards.js';
import { XP, TASK_IDS } from '../xp.js';
import type { Prize } from '../types.js';
import {
  addBalance,
  addHistory,
  getBalance,
  getDailyState,
  setDailyState,
} from '../supabaseStore.js';
import type { GetUserId, HistoryEntry } from './helpers.js';

const DAILY_REWARDS = [
  { day: 1, type: 'stars' as const, stars: 1 },
  { day: 2, type: 'stars' as const, stars: 1 },
  { day: 3, type: 'stars' as const, stars: 1 },
  { day: 4, type: 'stars' as const, stars: 1 },
  { day: 5, type: 'gift' as const, rarity: 'blue' as const },
  { day: 6, type: 'stars' as const, stars: 1 },
  { day: 7, type: 'gift' as const, rarity: 'purple' as const },
];

const MS_24H = 24 * 60 * 60 * 1000;

/** Next calendar day in the 1→7→1 loop (no streak break). */
function nextDailyDay(claimedDay: number): number {
  if (!claimedDay || claimedDay < 1) return 1;
  return claimedDay >= 7 ? 1 : claimedDay + 1;
}

export function registerDailyRoutes(app: FastifyInstance, deps: { getUserId: GetUserId }) {
  const { getUserId } = deps;

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
      newBalance = await addBalance(userId, stars);
      prize = { id: 900 + dayToClaim, name: `${stars} звёзд`, rarity: 'gold', icon: '⭐', stars };
    } else {
      const rarity = reward.rarity;
      let giftPool = PRIZES.filter((p) => !p.stars && !p.isPremium && p.rarity === rarity);
      if (giftPool.length === 0) {
        giftPool = PRIZES.filter((p) => !p.stars && !p.isPremium);
      }
      prize = pickOne(giftPool);
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
}
