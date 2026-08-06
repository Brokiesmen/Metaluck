import { getSupabase } from '../../supabaseStore.js';
import type {
  DepositCurrency,
  DepositOrder,
  DepositProductKind,
  DepositRail,
  DepositStatus,
} from './types.js';

function throwSb(error: { message?: string } | null, context: string): never {
  throw new Error(`${context}: ${error?.message ?? 'unknown Supabase error'}`);
}

function mapRow(r: Record<string, unknown>): DepositOrder {
  return {
    id: Number(r.id),
    publicId: String(r.public_id),
    userId: Number(r.user_id),
    rail: r.rail as DepositRail,
    currency: r.currency_code as DepositCurrency,
    productKind: (r.product_kind as DepositProductKind) ?? 'wallet_credit',
    expectedAmount: Number(r.expected_amount),
    receivedAmount: r.received_amount == null ? null : Number(r.received_amount),
    status: r.status as DepositStatus,
    externalId: r.external_id != null ? String(r.external_id) : null,
    packageId: r.package_id != null ? String(r.package_id) : null,
    depositAddress: r.deposit_address != null ? String(r.deposit_address) : null,
    memo: r.memo != null ? String(r.memo) : null,
    confirmations: Number(r.confirmations ?? 0),
    requiredConfirmations: Number(r.required_confirmations ?? 1),
    meta: (r.meta && typeof r.meta === 'object' ? r.meta : {}) as Record<string, unknown>,
    errorMessage: r.error_message != null ? String(r.error_message) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    expiresAt: r.expires_at != null ? String(r.expires_at) : null,
  };
}

const SELECT_COLS =
  'id, public_id, user_id, rail, currency_code, product_kind, expected_amount, received_amount, status, external_id, package_id, deposit_address, memo, confirmations, required_confirmations, meta, error_message, created_at, updated_at, expires_at';

export async function insertDepositOrder(row: {
  publicId: string;
  userId: number;
  rail: DepositRail;
  currency: DepositCurrency;
  productKind?: DepositProductKind;
  expectedAmount: number;
  packageId?: string | null;
  depositAddress?: string | null;
  memo?: string | null;
  requiredConfirmations?: number;
  meta?: Record<string, unknown>;
  expiresAt?: string | null;
}): Promise<DepositOrder> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('deposit_orders')
    .insert({
      public_id: row.publicId,
      user_id: row.userId,
      rail: row.rail,
      currency_code: row.currency,
      product_kind: row.productKind ?? 'wallet_credit',
      expected_amount: row.expectedAmount,
      package_id: row.packageId ?? null,
      deposit_address: row.depositAddress ?? null,
      memo: row.memo ?? null,
      required_confirmations: row.requiredConfirmations ?? 1,
      meta: row.meta ?? {},
      expires_at: row.expiresAt ?? null,
      status: 'pending',
    })
    .select(SELECT_COLS)
    .single();
  if (error) throwSb(error, 'insertDepositOrder');
  return mapRow(data as Record<string, unknown>);
}

export async function getDepositByPublicId(publicId: string): Promise<DepositOrder | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('deposit_orders')
    .select(SELECT_COLS)
    .eq('public_id', publicId)
    .maybeSingle();
  if (error) throwSb(error, 'getDepositByPublicId');
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function getDepositForUser(
  publicId: string,
  userId: number,
): Promise<DepositOrder | null> {
  const order = await getDepositByPublicId(publicId);
  if (!order || order.userId !== userId) return null;
  return order;
}

export async function listUserDeposits(
  userId: number,
  opts: { limit?: number; offset?: number } = {},
): Promise<{ total: number; orders: DepositOrder[] }> {
  const limit = Math.min(50, Math.max(1, Math.floor(opts.limit ?? 20)));
  const offset = Math.max(0, Math.floor(opts.offset ?? 0));
  const sb = getSupabase();

  const { count, error: countErr } = await sb
    .from('deposit_orders')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (countErr) throwSb(countErr, 'listUserDeposits count');

  const { data, error } = await sb
    .from('deposit_orders')
    .select(SELECT_COLS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throwSb(error, 'listUserDeposits');

  return {
    total: count ?? 0,
    orders: (data ?? []).map((r) => mapRow(r as Record<string, unknown>)),
  };
}

export async function failDepositOrder(publicId: string, errorMessage: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('deposit_orders')
    .update({
      status: 'failed',
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('public_id', publicId)
    .in('status', ['pending', 'confirming']);
  if (error) throwSb(error, 'failDepositOrder');
}

export async function expireDepositOrder(publicId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('deposit_orders')
    .update({
      status: 'expired',
      updated_at: new Date().toISOString(),
    })
    .eq('public_id', publicId)
    .in('status', ['pending', 'confirming']);
  if (error) throwSb(error, 'expireDepositOrder');
}

export async function patchDepositMeta(
  publicId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const order = await getDepositByPublicId(publicId);
  if (!order) return;
  const sb = getSupabase();
  const { error } = await sb
    .from('deposit_orders')
    .update({
      meta: { ...order.meta, ...patch },
      updated_at: new Date().toISOString(),
    })
    .eq('public_id', publicId);
  if (error) throwSb(error, 'patchDepositMeta');
}

export async function claimDepositPaid(args: {
  publicId: string;
  externalId: string;
  receivedAmount: number;
  confirmations?: number;
  meta?: Record<string, unknown>;
}): Promise<DepositOrder | null> {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('deposit_claim_paid', {
    p_public_id: args.publicId,
    p_external_id: args.externalId,
    p_received_amount: args.receivedAmount,
    p_confirmations: args.confirmations ?? null,
    p_meta: args.meta ?? null,
  });
  if (error) throwSb(error, 'deposit_claim_paid');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  // RPC returns a subset — reload full row for consistency
  return getDepositByPublicId(args.publicId);
}

export async function markDepositConfirming(args: {
  publicId: string;
  externalId: string;
  receivedAmount: number;
  confirmations: number;
}): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.rpc('deposit_mark_confirming', {
    p_public_id: args.publicId,
    p_external_id: args.externalId,
    p_received_amount: args.receivedAmount,
    p_confirmations: args.confirmations,
  });
  if (error) throwSb(error, 'deposit_mark_confirming');
}

/** Open crypto deposits waiting for chain confirmation. */
export async function listOpenCryptoDeposits(limit = 50): Promise<DepositOrder[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('deposit_orders')
    .select(SELECT_COLS)
    .in('rail', ['ton', 'usdt_ton'])
    .in('status', ['pending', 'confirming'])
    .order('created_at', { ascending: true })
    .limit(Math.min(100, Math.max(1, limit)));
  if (error) throwSb(error, 'listOpenCryptoDeposits');
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}
