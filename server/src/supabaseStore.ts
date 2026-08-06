import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { applyXpGain, xpToNextLevel, TASKS_PERIOD_MS, TASK_IDS, pickDailyTasks, type ProgressView } from './xp.js';

const DEFAULT_BALANCE = 0;

let client: SupabaseClient | null = null;

export function isSupabaseEnabled(): boolean {
  return Boolean(
    String(process.env.SUPABASE_URL ?? '').trim() &&
      String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim(),
  );
}

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = String(process.env.SUPABASE_URL ?? '').trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export function requireSupabase(): void {
  if (!isSupabaseEnabled()) {
    throw new Error(
      'Supabase is required: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment (see .env.example).',
    );
  }
  getSupabase();
}

function throwSb(error: { message?: string } | null, context: string): never {
  throw new Error(`${context}: ${error?.message ?? 'unknown Supabase error'}`);
}

/** Accept JSONB objects or legacy stringified JSON from SQLite-era rows. */
export function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

export async function ensureBalance(userId: number): Promise<number> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('balances')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throwSb(error, 'ensureBalance select');
  if (data) return Number(data.balance);

  const { data: inserted, error: insertErr } = await sb
    .from('balances')
    .upsert({ user_id: userId, balance: DEFAULT_BALANCE }, { onConflict: 'user_id', ignoreDuplicates: true })
    .select('balance')
    .maybeSingle();
  if (insertErr) throwSb(insertErr, 'ensureBalance upsert');
  if (inserted) return Number(inserted.balance);

  const { data: again, error: againErr } = await sb
    .from('balances')
    .select('balance')
    .eq('user_id', userId)
    .single();
  if (againErr) throwSb(againErr, 'ensureBalance reselect');
  return Number(again.balance);
}

export async function getBalance(userId: number): Promise<number> {
  return ensureBalance(userId);
}

export async function setBalance(userId: number, balance: number): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('balances')
    .upsert({ user_id: userId, balance }, { onConflict: 'user_id' });
  if (error) throwSb(error, 'setBalance');
}

export async function addBalance(userId: number, delta: number): Promise<number> {
  const current = await getBalance(userId);
  const next = current + delta;
  await setBalance(userId, next);
  return next;
}

/** Deduct amount if balance is sufficient. Returns new balance or null if not enough. */
export async function tryDeductBalance(userId: number, amount: number): Promise<number | null> {
  const current = await getBalance(userId);
  if (current < amount) return null;
  const next = current - amount;
  await setBalance(userId, next);
  return next;
}

export async function createWithdrawOrder(row: {
  user_id: number;
  amount: number;
  username?: string | null;
  display_name?: string | null;
}): Promise<{ id: number; amount: number; status: string; created_at: number }> {
  const sb = getSupabase();
  const now = Date.now();
  const { data, error } = await sb
    .from('withdraw_orders')
    .insert({
      user_id: row.user_id,
      amount: row.amount,
      status: 'pending',
      username: row.username ?? null,
      display_name: row.display_name ?? null,
      created_at: now,
      updated_at: now,
    })
    .select('id, amount, status, created_at')
    .single();
  if (error) throwSb(error, 'createWithdrawOrder');
  return {
    id: Number(data.id),
    amount: Number(data.amount),
    status: String(data.status),
    created_at: Number(data.created_at),
  };
}

export async function listWithdrawOrders(userId: number, limit = 10) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('withdraw_orders')
    .select('id, amount, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throwSb(error, 'listWithdrawOrders');
  return (data ?? []).map((r) => ({
    id: Number(r.id),
    amount: Number(r.amount),
    status: String(r.status),
    createdAt: Number(r.created_at),
  }));
}

export async function addHistory(
  userId: number,
  entry: { caseId: number; caseName: string; prize: unknown; timestamp: number },
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('histories').insert({
    user_id: userId,
    case_id: entry.caseId,
    case_name: entry.caseName,
    prize: entry.prize,
    ts: entry.timestamp,
  });
  if (error) throwSb(error, 'addHistory');
}

/** Last free Wheel of Fortune spin (tracked via histories case_id). */
export async function getLastWheelAt(userId: number, wheelCaseId: number): Promise<number> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('histories')
    .select('ts')
    .eq('user_id', userId)
    .eq('case_id', wheelCaseId)
    .order('ts', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throwSb(error, 'getLastWheelAt');
  return Number(data?.ts ?? 0);
}

/** Coupon balance from ledger rows (case_id = coupon ledger). */
export async function getCoupons(userId: number, ledgerCaseId: number): Promise<number> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('histories')
    .select('prize')
    .eq('user_id', userId)
    .eq('case_id', ledgerCaseId);
  if (error) throwSb(error, 'getCoupons');
  let total = 0;
  for (const row of data ?? []) {
    const prize = parseJsonField<{ coupons?: unknown }>(row.prize, {});
    const n = Number(prize.coupons);
    if (Number.isFinite(n)) total += n;
  }
  return Math.max(0, Math.floor(total));
}

export async function addCouponsLedger(
  userId: number,
  delta: number,
  ledgerCaseId: number,
  ledgerCaseName: string,
): Promise<number> {
  if (!Number.isFinite(delta) || delta === 0) {
    return getCoupons(userId, ledgerCaseId);
  }
  const now = Date.now();
  await addHistory(userId, {
    caseId: ledgerCaseId,
    caseName: ledgerCaseName,
    prize: {
      id: 9210,
      name: delta > 0 ? `+${delta} купон` : `${delta} купон`,
      rarity: 'gold',
      icon: '🎟️',
      coupons: delta,
    },
    timestamp: now,
  });
  return getCoupons(userId, ledgerCaseId);
}

export async function trySpendCoupon(
  userId: number,
  ledgerCaseId: number,
  ledgerCaseName: string,
): Promise<number | null> {
  const current = await getCoupons(userId, ledgerCaseId);
  if (current < 1) return null;
  return addCouponsLedger(userId, -1, ledgerCaseId, ledgerCaseName);
}

export async function setTopupOrderMeta(payload: string, meta: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('topup_orders')
    .update({ error_message: meta, updated_at: Date.now() })
    .eq('payload', payload);
  if (error) throwSb(error, 'setTopupOrderMeta');
}

export async function getTopupOrderMeta(payload: string, userId: number) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('topup_orders')
    .select('status, balance_amount, package_id, error_message')
    .eq('payload', payload)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throwSb(error, 'getTopupOrderMeta');
  if (!data) return null;
  return {
    status: data.status as string,
    balance_amount: Number(data.balance_amount),
    package_id: String(data.package_id),
    meta: data.error_message != null ? String(data.error_message) : null,
  };
}

export async function getHistoryPage(userId: number, limit: number, offset: number) {
  const sb = getSupabase();
  const { count, error: countErr } = await sb
    .from('histories')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (countErr) throwSb(countErr, 'getHistoryPage count');

  const { data, error } = await sb
    .from('histories')
    .select('case_id, case_name, prize, ts')
    .eq('user_id', userId)
    .order('ts', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throwSb(error, 'getHistoryPage select');

  return {
    total: count ?? 0,
    rows: (data ?? []).map((r) => ({
      caseId: r.case_id as number,
      caseName: r.case_name as string,
      prize: parseJsonField(r.prize, {}),
      timestamp: Number(r.ts),
    })),
  };
}

export async function getLeadersPage(limit: number, offset: number) {
  const sb = getSupabase();
  const { count, error: countErr } = await sb
    .from('balances')
    .select('*', { count: 'exact', head: true });
  if (countErr) throwSb(countErr, 'getLeadersPage count');

  const { data: balances, error } = await sb
    .from('balances')
    .select('user_id, balance')
    .order('balance', { ascending: false })
    .order('user_id', { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throwSb(error, 'getLeadersPage balances');

  const ids = (balances ?? []).map((b) => Number(b.user_id));
  let profilesById = new Map<number, { name: string; photo_url?: string | null }>();
  if (ids.length > 0) {
    const { data: profiles, error: pErr } = await sb
      .from('user_profiles')
      .select('user_id, name, photo_url')
      .in('user_id', ids);
    if (pErr) throwSb(pErr, 'getLeadersPage profiles');
    profilesById = new Map(
      (profiles ?? []).map((p) => [
        Number(p.user_id),
        { name: p.name as string, photo_url: p.photo_url as string | null },
      ]),
    );
  }

  return {
    total: count ?? 0,
    leaders: (balances ?? []).map((b) => {
      const uid = Number(b.user_id);
      const p = profilesById.get(uid);
      return {
        userId: uid,
        name: p?.name || 'Аноним',
        photoUrl: p?.photo_url ?? undefined,
        balance: Number(b.balance),
      };
    }),
  };
}

export async function getProfile(userId: number) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('user_profiles')
    .select('name, photo_url')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throwSb(error, 'getProfile');
  return data as { name: string; photo_url?: string | null } | null;
}

export async function setProfile(userId: number, name: string, photoUrl?: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('user_profiles').upsert(
    { user_id: userId, name, photo_url: photoUrl ?? null },
    { onConflict: 'user_id' },
  );
  if (error) throwSb(error, 'setProfile');
}

export async function upsertUserMeta(userId: number, isPremium: boolean): Promise<void> {
  const sb = getSupabase();
  const now = Date.now();
  const { data: existing } = await sb
    .from('user_meta')
    .select('is_premium')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    const { error } = await sb.from('user_meta').insert({
      user_id: userId,
      first_seen_at: now,
      is_premium: isPremium ? 1 : 0,
    });
    if (error) throwSb(error, 'upsertUserMeta insert');
    return;
  }

  if (isPremium && Number(existing.is_premium) !== 1) {
    const { error } = await sb.from('user_meta').update({ is_premium: 1 }).eq('user_id', userId);
    if (error) throwSb(error, 'upsertUserMeta update');
  }
}

export async function getUserMeta(userId: number) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('user_meta')
    .select('first_seen_at, is_premium')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throwSb(error, 'getUserMeta');
  return data as { first_seen_at: number; is_premium: number } | null;
}

export async function getDailyState(userId: number) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('daily_states')
    .select('claimed_day, last_claim_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throwSb(error, 'getDailyState');
  if (!data) return null;
  return {
    claimed_day: Number(data.claimed_day),
    last_claim_at: Number(data.last_claim_at),
  };
}

export async function setDailyState(
  userId: number,
  claimedDay: number,
  lastClaimAt: number,
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('daily_states').upsert(
    {
      user_id: userId,
      claimed_day: claimedDay,
      last_claim_at: lastClaimAt,
    },
    { onConflict: 'user_id' },
  );
  if (error) throwSb(error, 'setDailyState');
}

export async function getLastFreeCaseAt(userId: number): Promise<number> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('daily_states')
    .select('last_free_case_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throwSb(error, 'getLastFreeCaseAt');
  return Number(data?.last_free_case_at ?? 0);
}

export async function setLastFreeCaseAt(userId: number, ts: number): Promise<void> {
  const sb = getSupabase();
  const { data: existing } = await sb
    .from('daily_states')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await sb
      .from('daily_states')
      .update({ last_free_case_at: ts })
      .eq('user_id', userId);
    if (error) throwSb(error, 'setLastFreeCaseAt update');
    return;
  }

  const { error } = await sb.from('daily_states').insert({
    user_id: userId,
    claimed_day: 0,
    last_claim_at: 0,
    last_free_case_at: ts,
  });
  if (error) throwSb(error, 'setLastFreeCaseAt insert');
}

export interface ReferralRow {
  user_id: number;
  code: string;
  referred_by: number | null;
  referred_users: unknown;
  total_earned: number;
}

export async function getReferral(userId: number): Promise<ReferralRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb.from('referrals').select('*').eq('user_id', userId).maybeSingle();
  if (error) throwSb(error, 'getReferral');
  if (!data) return null;
  return {
    user_id: Number(data.user_id),
    code: data.code as string,
    referred_by: data.referred_by == null ? null : Number(data.referred_by),
    referred_users: data.referred_users,
    total_earned: Number(data.total_earned),
  };
}

export async function ensureReferral(userId: number): Promise<ReferralRow> {
  const existing = await getReferral(userId);
  if (existing) return existing;

  const code = userId === 0 ? 'refdev' : `ref${userId}`;
  const sb = getSupabase();
  const { error } = await sb.from('referrals').upsert(
    {
      user_id: userId,
      code,
      referred_users: [],
      total_earned: 0,
    },
    { onConflict: 'user_id', ignoreDuplicates: true },
  );
  if (error) throwSb(error, 'ensureReferral');
  const row = await getReferral(userId);
  if (!row) throw new Error('ensureReferral: row missing after upsert');
  return row;
}

export async function resolveReferrerByCode(code: string): Promise<ReferralRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb.from('referrals').select('*').eq('code', code).maybeSingle();
  if (error) throwSb(error, 'resolveReferrerByCode');
  if (!data) return null;
  return {
    user_id: Number(data.user_id),
    code: data.code as string,
    referred_by: data.referred_by == null ? null : Number(data.referred_by),
    referred_users: data.referred_users,
    total_earned: Number(data.total_earned),
  };
}

export async function updateReferralReferrer(
  referrerId: number,
  referredUsers: number[],
  bonus: number,
): Promise<void> {
  const sb = getSupabase();
  const current = await getReferral(referrerId);
  const { error } = await sb
    .from('referrals')
    .update({
      referred_users: referredUsers,
      total_earned: Number(current?.total_earned ?? 0) + bonus,
    })
    .eq('user_id', referrerId);
  if (error) throwSb(error, 'updateReferralReferrer');
}

export async function setReferredBy(userId: number, referrerId: number): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('referrals').update({ referred_by: referrerId }).eq('user_id', userId);
  if (error) throwSb(error, 'setReferredBy');
}

export async function addReferralEarned(userId: number, amount: number): Promise<void> {
  const row = await ensureReferral(userId);
  const sb = getSupabase();
  const { error } = await sb
    .from('referrals')
    .update({ total_earned: Number(row.total_earned) + amount })
    .eq('user_id', userId);
  if (error) throwSb(error, 'addReferralEarned');
}

export async function insertTopupOrder(row: {
  payload: string;
  user_id: number;
  package_id: string;
  xtr_amount: number;
  balance_amount: number;
  created_at: number;
  updated_at: number;
}): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('topup_orders').insert({
    ...row,
    status: 'pending',
  });
  if (error) throwSb(error, 'insertTopupOrder');
}

export async function failTopupOrder(payload: string, errorMessage: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('topup_orders')
    .update({
      status: 'failed',
      error_message: errorMessage,
      updated_at: Date.now(),
    })
    .eq('payload', payload);
  if (error) throwSb(error, 'failTopupOrder');
}

export async function getTopupOrderForUser(payload: string, userId: number) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('topup_orders')
    .select('status, balance_amount')
    .eq('payload', payload)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throwSb(error, 'getTopupOrderForUser');
  if (!data) return null;
  return { status: data.status as string, balance_amount: Number(data.balance_amount) };
}

export async function getTopupOrderForCheckout(payload: string, userId: number) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('topup_orders')
    .select('package_id, xtr_amount, status')
    .eq('payload', payload)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throwSb(error, 'getTopupOrderForCheckout');
  if (!data) return null;
  return {
    package_id: data.package_id as string,
    xtr_amount: Number(data.xtr_amount),
    status: data.status as string,
  };
}

export async function getTopupOrderByPayload(payload: string) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('topup_orders')
    .select('user_id, package_id, xtr_amount, balance_amount, status')
    .eq('payload', payload)
    .maybeSingle();
  if (error) throwSb(error, 'getTopupOrderByPayload');
  if (!data) return null;
  return {
    user_id: Number(data.user_id),
    package_id: data.package_id as string,
    xtr_amount: Number(data.xtr_amount),
    balance_amount: Number(data.balance_amount),
    status: data.status as string,
  };
}

/** Atomically claim a pending order as paid. Returns the order if this caller won the race. */
export async function claimTopupPaid(
  payload: string,
  chargeId: string,
  providerChargeId: string | null,
): Promise<{
  user_id: number;
  package_id: string;
  xtr_amount: number;
  balance_amount: number;
} | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('topup_orders')
    .update({
      status: 'paid',
      telegram_payment_charge_id: chargeId,
      provider_payment_charge_id: providerChargeId,
      updated_at: Date.now(),
    })
    .eq('payload', payload)
    .eq('status', 'pending')
    .select('user_id, package_id, xtr_amount, balance_amount')
    .maybeSingle();
  if (error) throwSb(error, 'claimTopupPaid');
  if (!data) return null;
  return {
    user_id: Number(data.user_id),
    package_id: data.package_id as string,
    xtr_amount: Number(data.xtr_amount),
    balance_amount: Number(data.balance_amount),
  };
}

// ── Account XP / levels ───────────────────────────────────────────────────────

export type TasksState = {
  periodStartedAt: number;
  /** Task ids selected for this 24h period. */
  active: string[];
  /** Completed task ids within the period. */
  ids: string[];
};

export interface UserProgressRow {
  user_id: number;
  level: number;
  xp: number;
  total_xp: number;
  last_daily_login_at: number;
  tasks: TasksState;
}

function startTasksPeriod(userId: number, now: number, avoid: string[] = []): TasksState {
  return {
    periodStartedAt: now,
    active: pickDailyTasks(userId, now, undefined, avoid),
    ids: [],
  };
}

function normalizeTasksState(
  userId: number,
  raw: unknown,
  now = Date.now(),
): { state: TasksState; rotated: boolean } {
  // Legacy: claimed_tasks was a plain string[] of one-time ids.
  if (Array.isArray(raw)) {
    return { state: startTasksPeriod(userId, now), rotated: true };
  }
  if (raw && typeof raw === 'object') {
    const o = raw as { periodStartedAt?: unknown; ids?: unknown; active?: unknown };
    const periodStartedAt = Number(o.periodStartedAt) || 0;
    const ids = Array.isArray(o.ids) ? o.ids.map(String) : [];
    const active = Array.isArray(o.active) ? o.active.map(String).filter(Boolean) : [];
    if (!periodStartedAt || now - periodStartedAt >= TASKS_PERIOD_MS) {
      return { state: startTasksPeriod(userId, now, active), rotated: true };
    }
    if (active.length === 0) {
      // Old shape without `active` — pick a set for the remaining period window.
      const picked = pickDailyTasks(userId, periodStartedAt);
      return {
        state: { periodStartedAt, active: picked, ids: ids.filter((id) => picked.includes(id)) },
        rotated: true,
      };
    }
    return { state: { periodStartedAt, active, ids }, rotated: false };
  }
  return { state: startTasksPeriod(userId, now), rotated: true };
}

async function persistProgress(row: UserProgressRow): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('user_progress').upsert(
    {
      user_id: row.user_id,
      level: row.level,
      xp: row.xp,
      total_xp: row.total_xp,
      last_daily_login_at: row.last_daily_login_at,
      claimed_tasks: row.tasks,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) throwSb(error, 'persistProgress');
}

async function ensureProgressRow(userId: number): Promise<UserProgressRow> {
  const sb = getSupabase();
  const now = Date.now();
  const { data, error } = await sb
    .from('user_progress')
    .select('user_id, level, xp, total_xp, last_daily_login_at, claimed_tasks')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throwSb(error, 'ensureProgressRow select');

  if (!data) {
    const row: UserProgressRow = {
      user_id: userId,
      level: 1,
      xp: 0,
      total_xp: 0,
      last_daily_login_at: 0,
      tasks: startTasksPeriod(userId, now),
    };
    const { error: insErr } = await sb.from('user_progress').insert({
      user_id: userId,
      level: 1,
      xp: 0,
      total_xp: 0,
      last_daily_login_at: 0,
      claimed_tasks: row.tasks,
    });
    if (insErr) throwSb(insErr, 'ensureProgressRow insert');
    return row;
  }

  const { state, rotated } = normalizeTasksState(userId, data.claimed_tasks, now);
  const row: UserProgressRow = {
    user_id: Number(data.user_id),
    level: Number(data.level) || 1,
    xp: Number(data.xp) || 0,
    total_xp: Number(data.total_xp) || 0,
    last_daily_login_at: Number(data.last_daily_login_at) || 0,
    tasks: state,
  };
  if (rotated) {
    await persistProgress(row).catch((err) => {
      console.warn('[xp] tasks rotate persist failed', userId, err);
    });
  }
  return row;
}

function toProgressView(
  row: UserProgressRow,
  extra?: { xpGained?: number; leveledUp?: boolean },
): ProgressView {
  const done = new Set(row.tasks.ids);
  return {
    level: row.level,
    xp: row.xp,
    xpForNextLevel: xpToNextLevel(row.level),
    totalXp: row.total_xp,
    xpGained: extra?.xpGained,
    leveledUp: extra?.leveledUp,
    tasksResetAt: row.tasks.periodStartedAt + TASKS_PERIOD_MS,
    tasks: row.tasks.active.map((id) => ({ id, done: done.has(id) })),
  };
}

export async function getProgress(userId: number): Promise<ProgressView> {
  const row = await ensureProgressRow(userId);
  return toProgressView(row);
}

/** Award XP and persist. Returns updated progress (includes xpGained). */
export async function awardXp(userId: number, amount: number): Promise<ProgressView> {
  const gain = Math.max(0, Math.floor(amount));
  const row = await ensureProgressRow(userId);
  if (gain <= 0) return toProgressView(row, { xpGained: 0, leveledUp: false });

  const next = applyXpGain(row.level, row.xp, gain);
  const updated: UserProgressRow = {
    ...row,
    level: next.level,
    xp: next.xp,
    total_xp: row.total_xp + gain,
  };

  await persistProgress(updated);
  return toProgressView(updated, { xpGained: gain, leveledUp: next.leveledUp });
}

/** Login XP only when `daily_login` is in today's active task set. */
export async function claimDailyLoginXp(
  userId: number,
  amount: number,
): Promise<ProgressView> {
  const row = await ensureProgressRow(userId);
  if (!row.tasks.active.includes(TASK_IDS.DAILY_LOGIN)) {
    return toProgressView(row, { xpGained: 0, leveledUp: false });
  }
  if (row.tasks.ids.includes(TASK_IDS.DAILY_LOGIN)) {
    return toProgressView(row, { xpGained: 0, leveledUp: false });
  }

  const gain = Math.max(0, Math.floor(amount));
  const next = applyXpGain(row.level, row.xp, gain);
  const updated: UserProgressRow = {
    ...row,
    level: next.level,
    xp: next.xp,
    total_xp: row.total_xp + gain,
    last_daily_login_at: Date.now(),
    tasks: { ...row.tasks, ids: [...row.tasks.ids, TASK_IDS.DAILY_LOGIN] },
  };

  await persistProgress(updated);
  return toProgressView(updated, { xpGained: gain, leveledUp: next.leveledUp });
}

/** Complete a task if it is active this period; no-op otherwise. */
export async function claimTaskXp(
  userId: number,
  taskId: string,
  amount: number,
): Promise<ProgressView> {
  const row = await ensureProgressRow(userId);
  if (!row.tasks.active.includes(taskId) || row.tasks.ids.includes(taskId)) {
    return toProgressView(row, { xpGained: 0, leveledUp: false });
  }

  const gain = Math.max(0, Math.floor(amount));
  const next = applyXpGain(row.level, row.xp, gain);
  const updated: UserProgressRow = {
    ...row,
    level: next.level,
    xp: next.xp,
    total_xp: row.total_xp + gain,
    tasks: { ...row.tasks, ids: [...row.tasks.ids, taskId] },
  };

  await persistProgress(updated);
  return toProgressView(updated, { xpGained: gain, leveledUp: next.leveledUp });
}

/** Chats that started the bot — recipients for broadcast. */
export async function upsertBotChat(input: {
  chatId: number;
  userId: number;
  username?: string | null;
  firstName?: string | null;
}): Promise<void> {
  const sb = getSupabase();
  const now = Date.now();
  const { error } = await sb.from('bot_chats').upsert(
    {
      chat_id: input.chatId,
      user_id: input.userId,
      username: input.username ?? null,
      first_name: input.firstName ?? null,
      blocked: false,
      last_start_at: now,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chat_id' },
  );
  if (error) throwSb(error, 'upsertBotChat');
}

export async function markBotChatBlocked(chatId: number, blocked = true): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('bot_chats')
    .update({ blocked, updated_at: new Date().toISOString() })
    .eq('chat_id', chatId);
  if (error) throwSb(error, 'markBotChatBlocked');
}

export async function listBroadcastChatIds(limit = 5000): Promise<number[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('bot_chats')
    .select('chat_id')
    .eq('blocked', false)
    .order('last_start_at', { ascending: false })
    .limit(Math.min(20_000, Math.max(1, limit)));
  if (error) throwSb(error, 'listBroadcastChatIds');
  return (data ?? []).map((r) => Number(r.chat_id)).filter((id) => Number.isFinite(id) && id > 0);
}

export { DEFAULT_BALANCE };
