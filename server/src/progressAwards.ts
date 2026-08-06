import { awardXp, claimTaskXp } from './supabaseStore.js';
import { TASK_IDS, taskXp, type GameKind } from './xp.js';

/** Never throw into game flows — XP is best-effort. */
export async function quietAwardXp(userId: number, amount: number): Promise<void> {
  if (userId <= 0 || amount <= 0) return;
  try {
    await awardXp(userId, amount);
  } catch (err) {
    console.error('[xp] award failed', userId, amount, err);
  }
}

export async function quietClaimTask(
  userId: number,
  taskId: string,
  amount?: number,
): Promise<void> {
  if (userId <= 0) return;
  const xp = amount ?? taskXp(taskId);
  if (xp <= 0) return;
  try {
    await claimTaskXp(userId, taskId, xp);
  } catch (err) {
    console.error('[xp] task failed', userId, taskId, err);
  }
}

/** Try several task ids (only active ones for this period will complete). */
export async function quietTryTasks(userId: number, taskIds: string[]): Promise<void> {
  for (const id of taskIds) {
    await quietClaimTask(userId, id);
  }
}

export async function onGamePlayXp(userId: number, game: GameKind): Promise<void> {
  await quietTryTasks(userId, [`play_${game}`]);
}

export async function onGameWinXp(userId: number, amount: number, game?: GameKind): Promise<void> {
  await quietAwardXp(userId, amount);
  const ids: string[] = [TASK_IDS.WIN_GAME];
  if (game) {
    ids.push(`win_${game}`, `play_${game}`);
  }
  await quietTryTasks(userId, ids);
}
