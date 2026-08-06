import crypto from 'crypto';
import { getSupabase } from '../../supabaseStore.js';
import type { CryptoCurrency, CryptoNetwork } from './config.js';

export interface DepositAddressRow {
  id: number;
  userId: number;
  network: CryptoNetwork;
  address: string;
  addressRaw: string;
  derivationVersion: number;
  lastLt: string | null;
  lastScannedAt: string | null;
  lastRequestedAt: string;
  createdAt: string;
}

export type ChainTxStatus = 'pending' | 'confirmed' | 'failed' | 'detected' | 'confirming' | 'credited' | 'ignored';

export interface ChainTxRow {
  id: number;
  publicId: string;
  userId: number;
  network: CryptoNetwork;
  currency: CryptoCurrency;
  txHash: string;
  lt: string | null;
  fromAddress: string | null;
  toAddress: string;
  amount: number;
  confirmations: number;
  requiredConfirmations: number;
  status: ChainTxStatus;
  depositAddressId: number | null;
  memo: string | null;
  errorMessage: string | null;
  detectedAt: string;
  creditedAt: string | null;
  updatedAt: string;
}

function mapAddress(r: Record<string, unknown>): DepositAddressRow {
  return {
    id: Number(r.id),
    userId: Number(r.user_id),
    network: 'ton',
    address: String(r.address),
    addressRaw: String(r.address_raw),
    derivationVersion: Number(r.derivation_version ?? 1),
    lastLt: r.last_lt == null ? null : String(r.last_lt),
    lastScannedAt: r.last_scanned_at == null ? null : String(r.last_scanned_at),
    lastRequestedAt: String(r.last_requested_at),
    createdAt: String(r.created_at),
  };
}

function mapTx(r: Record<string, unknown>): ChainTxRow {
  return {
    id: Number(r.id),
    publicId: String(r.public_id),
    userId: Number(r.user_id),
    network: 'ton',
    currency: String(r.currency_code) as CryptoCurrency,
    txHash: String(r.tx_hash),
    lt: r.lt == null ? null : String(r.lt),
    fromAddress: r.from_address == null ? null : String(r.from_address),
    toAddress: String(r.to_address),
    amount: Number(r.amount),
    confirmations: Number(r.confirmations ?? 0),
    requiredConfirmations: Number(r.required_confirmations ?? 1),
    status: String(r.status) as ChainTxStatus,
    depositAddressId: r.deposit_address_id == null ? null : Number(r.deposit_address_id),
    memo: r.memo == null ? null : String(r.memo),
    errorMessage: r.error_message == null ? null : String(r.error_message),
    detectedAt: String(r.detected_at),
    creditedAt: r.credited_at == null ? null : String(r.credited_at),
    updatedAt: String(r.updated_at),
  };
}

export async function getAddressByUser(userId: number): Promise<DepositAddressRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('crypto_deposit_addresses')
    .select('*')
    .eq('user_id', userId)
    .eq('network', 'ton')
    .maybeSingle();
  if (error) throw new Error(`getAddressByUser: ${error.message}`);
  return data ? mapAddress(data as Record<string, unknown>) : null;
}

export async function upsertDepositAddress(row: {
  userId: number;
  address: string;
  addressRaw: string;
  derivationVersion: number;
}): Promise<DepositAddressRow> {
  const sb = getSupabase();
  const existing = await getAddressByUser(row.userId);
  if (existing) {
    const { data, error } = await sb
      .from('crypto_deposit_addresses')
      .update({ last_requested_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw new Error(`touchDepositAddress: ${error.message}`);
    return mapAddress(data as Record<string, unknown>);
  }

  const { data, error } = await sb
    .from('crypto_deposit_addresses')
    .insert({
      user_id: row.userId,
      network: 'ton',
      address: row.address,
      address_raw: row.addressRaw,
      derivation_version: row.derivationVersion,
      last_requested_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw new Error(`insertDepositAddress: ${error.message}`);
  return mapAddress(data as Record<string, unknown>);
}

export async function listActiveAddresses(args: {
  sinceIso: string;
  limit: number;
}): Promise<DepositAddressRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('crypto_deposit_addresses')
    .select('*')
    .gte('last_requested_at', args.sinceIso)
    .order('last_scanned_at', { ascending: true, nullsFirst: true })
    .limit(args.limit);
  if (error) throw new Error(`listActiveAddresses: ${error.message}`);
  return (data ?? []).map((r) => mapAddress(r as Record<string, unknown>));
}

export async function markAddressScanned(id: number, lastLt: string | null): Promise<void> {
  const sb = getSupabase();
  const patch: Record<string, unknown> = { last_scanned_at: new Date().toISOString() };
  if (lastLt) patch.last_lt = lastLt;
  const { error } = await sb.from('crypto_deposit_addresses').update(patch).eq('id', id);
  if (error) throw new Error(`markAddressScanned: ${error.message}`);
}

export async function upsertDetectedTransfer(args: {
  userId: number;
  depositAddressId: number;
  currency: CryptoCurrency;
  txHash: string;
  lt: string | null;
  fromAddress: string | null;
  toAddress: string;
  amount: number;
  confirmations: number;
  requiredConfirmations: number;
  memo: string | null;
}): Promise<ChainTxRow> {
  const sb = getSupabase();

  const { data: existing } = await sb
    .from('crypto_chain_transactions')
    .select('*')
    .eq('network', 'ton')
    .eq('tx_hash', args.txHash)
    .eq('currency_code', args.currency)
    .maybeSingle();

  if (existing) {
    const row = mapTx(existing as Record<string, unknown>);
    const pub = row.status === 'confirmed' || row.status === 'credited'
      ? 'confirmed'
      : row.status === 'failed' || row.status === 'ignored'
        ? 'failed'
        : 'pending';

    if (pub === 'confirmed' || pub === 'failed') {
      return row;
    }

    // Amount must never change for the same hash (anti-tamper)
    if (row.amount !== args.amount) {
      const { data, error } = await sb
        .from('crypto_chain_transactions')
        .update({
          status: 'failed',
          error_message: 'amount_mismatch_for_tx_hash',
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
        .select('*')
        .single();
      if (error) throw new Error(`failAmountMismatch: ${error.message}`);
      return mapTx(data as Record<string, unknown>);
    }

    // Network / currency already keyed; bump confirmations only
    const { data, error } = await sb
      .from('crypto_chain_transactions')
      .update({
        confirmations: Math.max(row.confirmations, args.confirmations),
        status: 'pending',
        lt: args.lt ?? row.lt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .select('*')
      .single();
    if (error) throw new Error(`updateChainTx: ${error.message}`);
    return mapTx(data as Record<string, unknown>);
  }

  const publicId = `ctx_${crypto.randomBytes(10).toString('hex')}`;
  const { data, error } = await sb
    .from('crypto_chain_transactions')
    .insert({
      public_id: publicId,
      user_id: args.userId,
      network: 'ton',
      currency_code: args.currency,
      tx_hash: args.txHash,
      lt: args.lt,
      from_address: args.fromAddress,
      to_address: args.toAddress,
      amount: args.amount,
      confirmations: args.confirmations,
      required_confirmations: args.requiredConfirmations,
      status: 'pending',
      deposit_address_id: args.depositAddressId,
      memo: args.memo,
    })
    .select('*')
    .single();
  if (error) throw new Error(`insertChainTx: ${error.message}`);
  return mapTx(data as Record<string, unknown>);
}

export async function listPendingCredits(limit = 50): Promise<ChainTxRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('crypto_chain_transactions')
    .select('*')
    .in('status', ['pending', 'detected', 'confirming'])
    .order('updated_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(`listPendingCredits: ${error.message}`);
  return (data ?? []).map((r) => mapTx(r as Record<string, unknown>));
}

export async function listUserChainTx(userId: number, limit = 30): Promise<ChainTxRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('crypto_chain_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('detected_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listUserChainTx: ${error.message}`);
  return (data ?? []).map((r) => mapTx(r as Record<string, unknown>));
}

export async function claimCredit(publicId: string): Promise<ChainTxRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('crypto_tx_claim_credit', { p_public_id: publicId });
  if (error) throw new Error(`crypto_tx_claim_credit: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  // RPC returns partial — reload full row
  const { data: full, error: e2 } = await sb
    .from('crypto_chain_transactions')
    .select('*')
    .eq('public_id', publicId)
    .maybeSingle();
  if (e2) throw new Error(`reloadChainTx: ${e2.message}`);
  return full ? mapTx(full as Record<string, unknown>) : null;
}

export async function markTxFailed(publicId: string, message: string): Promise<void> {
  const sb = getSupabase();
  await sb
    .from('crypto_chain_transactions')
    .update({
      status: 'failed',
      error_message: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq('public_id', publicId)
    .in('status', ['pending', 'detected', 'confirming']);
}
