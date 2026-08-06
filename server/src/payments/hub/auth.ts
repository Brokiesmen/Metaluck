import type { FastifyRequest } from 'fastify';
import { getSupabase } from '../../supabaseStore.js';
import { verifyAdminSecret } from '../../routes/helpers.js';

function envAdminIds(): number[] {
  const raw = String(process.env.TELEGRAM_ADMIN_IDS ?? process.env.TELEGRAM_ADMIN_CHAT_ID ?? '').trim();
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.trunc(n));
}

export async function listPaymentAdmins(): Promise<
  Array<{ userId: number; note: string; createdAt: string }>
> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('payment_hub_admins')
    .select('user_id, note, created_at')
    .order('created_at', { ascending: true });
  if (error) throw new Error(`listPaymentAdmins: ${error.message}`);
  return (data ?? []).map((r) => ({
    userId: Number(r.user_id),
    note: String(r.note ?? ''),
    createdAt: String(r.created_at),
  }));
}

export async function isPaymentAdminUser(userId: number): Promise<boolean> {
  if (!(userId > 0)) return false;
  if (envAdminIds().includes(userId)) return true;
  const sb = getSupabase();
  const { data, error } = await sb
    .from('payment_hub_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`isPaymentAdminUser: ${error.message}`);
  return Boolean(data);
}

export async function addPaymentAdmin(
  userId: number,
  note: string,
  createdBy: number | null,
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('payment_hub_admins').upsert(
    {
      user_id: userId,
      note: note.slice(0, 200),
      created_by: createdBy,
    },
    { onConflict: 'user_id' },
  );
  if (error) throw new Error(`addPaymentAdmin: ${error.message}`);
}

export async function removePaymentAdmin(userId: number): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('payment_hub_admins').delete().eq('user_id', userId);
  if (error) throw new Error(`removePaymentAdmin: ${error.message}`);
}

export async function writeAudit(args: {
  actorId: number | null;
  action: string;
  target?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const sb = getSupabase();
  await sb.from('payment_hub_audit').insert({
    actor_id: args.actorId,
    action: args.action,
    target: args.target ?? null,
    payload: args.payload ?? {},
  });
}

/**
 * Admin gate: x-admin-secret OR Telegram user in payment_hub_admins / TELEGRAM_ADMIN_IDS.
 * Returns actorId (0 for secret, telegram id for user).
 */
export async function assertPaymentAdmin(
  req: FastifyRequest,
  getUserId: (req: FastifyRequest) => Promise<number>,
): Promise<{ actorId: number; via: 'secret' | 'user' }> {
  if (verifyAdminSecret(req)) {
    return { actorId: 0, via: 'secret' };
  }
  const userId = await getUserId(req);
  if (await isPaymentAdminUser(userId)) {
    return { actorId: userId, via: 'user' };
  }
  throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
}
