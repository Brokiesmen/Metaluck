import crypto from 'crypto';
import { getSupabase } from '../../supabaseStore.js';
import type { CryptoCurrency } from './config.js';

export type WithdrawStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'needs_reconcile';

export interface WithdrawRow {
  id: number;
  publicId: string;
  userId: number;
  network: 'ton';
  currency: CryptoCurrency;
  toAddress: string;
  toAddressRaw: string;
  amount: number;
  networkFee: number;
  netAmount: number;
  status: WithdrawStatus;
  txHash: string | null;
  errorMessage: string | null;
  confirmedByUser: boolean;
  processedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapRow(r: Record<string, unknown>): WithdrawRow {
  return {
    id: Number(r.id),
    publicId: String(r.public_id),
    userId: Number(r.user_id),
    network: 'ton',
    currency: String(r.currency_code) as CryptoCurrency,
    toAddress: String(r.to_address),
    toAddressRaw: String(r.to_address_raw),
    amount: Number(r.amount),
    networkFee: Number(r.network_fee),
    netAmount: Number(r.net_amount),
    status: String(r.status) as WithdrawStatus,
    txHash: r.tx_hash == null ? null : String(r.tx_hash),
    errorMessage: r.error_message == null ? null : String(r.error_message),
    confirmedByUser: Boolean(r.confirmed_by_user),
    processedAt: r.processed_at == null ? null : String(r.processed_at),
    completedAt: r.completed_at == null ? null : String(r.completed_at),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export async function insertWithdraw(args: {
  userId: number;
  currency: CryptoCurrency;
  toAddress: string;
  toAddressRaw: string;
  amount: number;
  networkFee: number;
  netAmount: number;
}): Promise<WithdrawRow> {
  const sb = getSupabase();
  const publicId = `cwd_${crypto.randomBytes(10).toString('hex')}`;
  const { data, error } = await sb
    .from('crypto_withdrawals')
    .insert({
      public_id: publicId,
      user_id: args.userId,
      network: 'ton',
      currency_code: args.currency,
      to_address: args.toAddress,
      to_address_raw: args.toAddressRaw,
      amount: args.amount,
      network_fee: args.networkFee,
      net_amount: args.netAmount,
      status: 'pending',
      confirmed_by_user: true,
    })
    .select('*')
    .single();
  if (error) throw new Error(`insertWithdraw: ${error.message}`);
  return mapRow(data as Record<string, unknown>);
}

export async function listUserWithdrawals(userId: number, limit = 30): Promise<WithdrawRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('crypto_withdrawals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listUserWithdrawals: ${error.message}`);
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

export async function sumUserWithdrawalsToday(
  userId: number,
  currency: CryptoCurrency,
): Promise<number> {
  const sb = getSupabase();
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { data, error } = await sb
    .from('crypto_withdrawals')
    .select('amount, status')
    .eq('user_id', userId)
    .eq('currency_code', currency)
    .gte('created_at', since.toISOString())
    .in('status', ['pending', 'processing', 'completed']);
  if (error) throw new Error(`sumUserWithdrawalsToday: ${error.message}`);
  return (data ?? []).reduce((acc, r) => acc + Number((r as { amount: number }).amount), 0);
}

export async function claimPendingWithdraw(limit = 10): Promise<WithdrawRow[]> {
  const sb = getSupabase();
  const { data: pending, error } = await sb
    .from('crypto_withdrawals')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(`listPendingWithdraw: ${error.message}`);

  const claimed: WithdrawRow[] = [];
  for (const row of pending ?? []) {
    const pub = String((row as { public_id: string }).public_id);
    const { data, error: e2 } = await sb
      .from('crypto_withdrawals')
      .update({
        status: 'processing',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('public_id', pub)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle();
    if (e2) throw new Error(`claimWithdraw: ${e2.message}`);
    if (data) claimed.push(mapRow(data as Record<string, unknown>));
  }
  return claimed;
}

export async function markWithdrawCompleted(
  publicId: string,
  txHash: string,
): Promise<WithdrawRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('crypto_withdrawals')
    .update({
      status: 'completed',
      tx_hash: txHash,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('public_id', publicId)
    .eq('status', 'processing')
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`markWithdrawCompleted: ${error.message}`);
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function markWithdrawFailed(
  publicId: string,
  message: string,
): Promise<void> {
  const sb = getSupabase();
  await sb
    .from('crypto_withdrawals')
    .update({
      status: 'failed',
      error_message: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq('public_id', publicId)
    .in('status', ['pending', 'processing']);
}

/** On-chain send likely succeeded — do NOT unlock; ops must reconcile. */
export async function markWithdrawNeedsReconcile(
  publicId: string,
  txHash: string | null,
  message: string,
): Promise<void> {
  const sb = getSupabase();
  const patch: Record<string, unknown> = {
    status: 'needs_reconcile',
    error_message: message.slice(0, 500),
    updated_at: new Date().toISOString(),
  };
  if (txHash) patch.tx_hash = txHash;
  await sb
    .from('crypto_withdrawals')
    .update(patch)
    .eq('public_id', publicId)
    .in('status', ['processing', 'needs_reconcile']);
}

export async function getWithdrawByPublicId(
  publicId: string,
  userId?: number,
): Promise<WithdrawRow | null> {
  const sb = getSupabase();
  let q = sb.from('crypto_withdrawals').select('*').eq('public_id', publicId);
  if (userId != null) q = q.eq('user_id', userId);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(`getWithdraw: ${error.message}`);
  return data ? mapRow(data as Record<string, unknown>) : null;
}
