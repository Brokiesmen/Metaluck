/** Account-wide XP (separate from PvP stats). */

/** Harder curve: L1≈300, L5≈1.2k, L10≈5.5k, L20≈80k */
export function xpToNextLevel(level: number): number {
  const L = Math.max(1, level);
  return Math.round(300 * Math.pow(1.42, L - 1));
}

/** Daily tasks rotate on this interval. */
export const TASKS_PERIOD_MS = 24 * 60 * 60 * 1000;
export const DAILY_TASK_COUNT = 4;

export const XP = {
  DAILY_LOGIN: 12,
  DAILY_CLAIM: (day: number) => 10 + Math.max(1, day) * 3,
  CASE_OPEN: (price: number) => Math.min(18, 3 + Math.floor(Math.max(0, price) / 3)),
  FREE_CASE: 8,
  WHEEL_SPIN: 10,
  COINFLIP_WIN: 6,
  BJ_WIN: 8,
  BJ_BLACKJACK: 14,
  MINERUSH_CASHOUT: (score: number) => Math.min(22, 3 + Math.floor(Math.max(0, score) / 3)),
  ARENA_WIN: 15,
  AVIATOR_CASHOUT: (mult: number) => Math.min(24, 4 + Math.floor(Math.max(0, mult - 1) * 4)),
} as const;

export type TaskGroup = 'login' | 'case' | 'daily' | 'play' | 'win';

export type TaskDef = {
  id: string;
  xp: number;
  group: TaskGroup;
};

/** Full pool — each 24h period picks a different subset. */
export const TASK_CATALOG: TaskDef[] = [
  { id: 'daily_login', xp: 12, group: 'login' },
  { id: 'open_case', xp: 20, group: 'case' },
  { id: 'open_paid_case', xp: 28, group: 'case' },
  { id: 'claim_daily', xp: 20, group: 'daily' },
  { id: 'play_coinflip', xp: 15, group: 'play' },
  { id: 'play_blackjack', xp: 15, group: 'play' },
  { id: 'play_minerush', xp: 15, group: 'play' },
  { id: 'play_arena', xp: 15, group: 'play' },
  { id: 'play_aviator', xp: 15, group: 'play' },
  { id: 'win_game', xp: 22, group: 'win' },
  { id: 'win_coinflip', xp: 25, group: 'win' },
  { id: 'win_blackjack', xp: 25, group: 'win' },
  { id: 'win_minerush', xp: 25, group: 'win' },
  { id: 'win_arena', xp: 30, group: 'win' },
  { id: 'win_aviator', xp: 28, group: 'win' },
];

export const TASK_BY_ID: Record<string, TaskDef> = Object.fromEntries(
  TASK_CATALOG.map((t) => [t.id, t]),
);

/** Stable ids for call sites. */
export const TASK_IDS = {
  DAILY_LOGIN: 'daily_login',
  OPEN_CASE: 'open_case',
  OPEN_PAID_CASE: 'open_paid_case',
  CLAIM_DAILY: 'claim_daily',
  PLAY_COINFLIP: 'play_coinflip',
  PLAY_BLACKJACK: 'play_blackjack',
  PLAY_MINERUSH: 'play_minerush',
  PLAY_ARENA: 'play_arena',
  PLAY_AVIATOR: 'play_aviator',
  WIN_GAME: 'win_game',
  WIN_COINFLIP: 'win_coinflip',
  WIN_BLACKJACK: 'win_blackjack',
  WIN_MINERUSH: 'win_minerush',
  WIN_ARENA: 'win_arena',
  WIN_AVIATOR: 'win_aviator',
} as const;

export type GameKind = 'coinflip' | 'blackjack' | 'minerush' | 'arena' | 'aviator';

export function taskXp(taskId: string): number {
  return TASK_BY_ID[taskId]?.xp ?? 20;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pick `count` tasks for this user/period.
 * Seeded so the set is stable within the period, different across days/users,
 * and prefers avoiding the previous set + diverse groups.
 */
export function pickDailyTasks(
  userId: number,
  periodStartedAt: number,
  count = DAILY_TASK_COUNT,
  avoid: string[] = [],
): string[] {
  const periodKey = Math.floor(periodStartedAt / TASKS_PERIOD_MS);
  const seed = ((userId * 1_000_003) ^ (periodKey * 9176) ^ 0x9e3779b9) >>> 0;
  const rand = mulberry32(seed);
  const avoidSet = new Set(avoid);

  const pool = [...TASK_CATALOG];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Prefer tasks not in the previous set.
  pool.sort((a, b) => Number(avoidSet.has(a.id)) - Number(avoidSet.has(b.id)));

  const picked: TaskDef[] = [];
  const usedGroups = new Set<TaskGroup>();

  const tryPick = (allowSameGroup: boolean) => {
    for (const t of pool) {
      if (picked.length >= count) return;
      if (picked.some((p) => p.id === t.id)) continue;
      if (!allowSameGroup && usedGroups.has(t.group)) continue;
      picked.push(t);
      usedGroups.add(t.group);
    }
  };

  tryPick(false);
  tryPick(true);

  return picked.slice(0, count).map((t) => t.id);
}

export type ProgressView = {
  level: number;
  xp: number;
  xpForNextLevel: number;
  totalXp: number;
  xpGained?: number;
  leveledUp?: boolean;
  /** When current task period ends (ms). */
  tasksResetAt: number;
  tasks: {
    id: string;
    done: boolean;
  }[];
};

export function applyXpGain(level: number, xp: number, gain: number): {
  level: number;
  xp: number;
  leveledUp: boolean;
} {
  let nextLevel = Math.max(1, level);
  let nextXp = Math.max(0, xp) + Math.max(0, gain);
  let leveledUp = false;
  while (nextXp >= xpToNextLevel(nextLevel)) {
    nextXp -= xpToNextLevel(nextLevel);
    nextLevel += 1;
    leveledUp = true;
  }
  return { level: nextLevel, xp: nextXp, leveledUp };
}
