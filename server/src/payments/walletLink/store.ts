/**
 * Хранилище привязанных кошельков и challenge-nonce (Supabase).
 * account_id = getUserId(req) (telegram_id ИЛИ accounts.id) — см. миграцию.
 */

import crypto from 'crypto';
import { getSupabase } from '../../supabaseStore.js';

export type WalletChain = 'ton' | 'evm';

export interface LinkedWallet {
  id: number;
  accountId: number;
  chain: WalletChain;
  address: string;
  addressDisplay: string | null;
  publicKey: string | null;
  verifiedAt: string;
}

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const NONCE_BYTES = 24;

function mapWallet(r: Record<string, unknown>): LinkedWallet {
  return {
    id: Number(r.id),
    accountId: Number(r.account_id),
    chain: (String(r.chain) as WalletChain),
    address: String(r.address),
    addressDisplay: r.address_display == null ? null : String(r.address_display),
    publicKey: r.public_key == null ? null : String(r.public_key),
    verifiedAt: String(r.verified_at),
  };
}

/** Новый одноразовый nonce для доказательства владения. */
export async function createLinkChallenge(
  accountId: number,
  chain: WalletChain,
): Promise<{ nonce: string; expiresAt: string }> {
  const sb = getSupabase();
  const nonce = crypto.randomBytes(NONCE_BYTES).toString('base64url');
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
  const { error } = await sb.from('wallet_link_challenges').insert({
    id: nonce,
    account_id: accountId,
    chain,
    status: 'pending',
    expires_at: expiresAt,
  });
  if (error) throw new Error(`createLinkChallenge: ${error.message}`);
  return { nonce, expiresAt };
}

/**
 * Забрать и погасить nonce (одноразово, привязан к account+chain).
 * Возвращает true только если он был pending, не истёк и принадлежит этому account/chain.
 */
export async function consumeLinkChallenge(
  nonce: string,
  accountId: number,
  chain: WalletChain,
): Promise<boolean> {
  if (!nonce || nonce.length > 200) return false;
  const sb = getSupabase();
  const { data, error } = await sb
    .from('wallet_link_challenges')
    .update({ status: 'consumed', consumed_at: new Date().toISOString() })
    .eq('id', nonce)
    .eq('account_id', accountId)
    .eq('chain', chain)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`consumeLinkChallenge: ${error.message}`);
  return Boolean(data);
}

export async function listLinkedWallets(accountId: number): Promise<LinkedWallet[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('linked_wallets')
    .select('*')
    .eq('account_id', accountId)
    .order('verified_at', { ascending: false });
  if (error) throw new Error(`listLinkedWallets: ${error.message}`);
  return (data ?? []).map((r) => mapWallet(r as Record<string, unknown>));
}

/**
 * Привязать/перепривязать адрес. Если адрес уже привязан к ДРУГОМУ аккаунту —
 * отказ (unique chain+address). Перепривязка того же chain на этом аккаунте
 * заменяет предыдущий адрес.
 */
export async function upsertLinkedWallet(input: {
  accountId: number;
  chain: WalletChain;
  address: string;
  addressDisplay?: string | null;
  publicKey?: string | null;
}): Promise<{ ok: true; wallet: LinkedWallet } | { ok: false; reason: 'taken' }> {
  const sb = getSupabase();

  // Адрес уже за кем-то?
  const { data: owner, error: findErr } = await sb
    .from('linked_wallets')
    .select('account_id')
    .eq('chain', input.chain)
    .eq('address', input.address)
    .maybeSingle();
  if (findErr) throw new Error(`upsertLinkedWallet find: ${findErr.message}`);
  if (owner && Number(owner.account_id) !== input.accountId) {
    return { ok: false, reason: 'taken' };
  }

  const row = {
    account_id: input.accountId,
    chain: input.chain,
    address: input.address,
    address_display: input.addressDisplay ?? null,
    public_key: input.publicKey ?? null,
    verified_at: new Date().toISOString(),
  };
  const { data, error } = await sb
    .from('linked_wallets')
    .upsert(row, { onConflict: 'account_id,chain' })
    .select('*')
    .single();
  if (error) throw new Error(`upsertLinkedWallet: ${error.message}`);
  return { ok: true, wallet: mapWallet(data as Record<string, unknown>) };
}

export async function deleteLinkedWallet(accountId: number, id: number): Promise<boolean> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('linked_wallets')
    .delete()
    .eq('id', id)
    .eq('account_id', accountId)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`deleteLinkedWallet: ${error.message}`);
  return Boolean(data);
}

/** Анонимный challenge для входа (account_id = 0). */
export async function createLoginWalletChallenge(
  chain: WalletChain,
): Promise<{ nonce: string; expiresAt: string }> {
  return createLinkChallenge(0, chain);
}

export async function consumeLoginWalletChallenge(
  nonce: string,
  chain: WalletChain,
): Promise<boolean> {
  return consumeLinkChallenge(nonce, 0, chain);
}

export async function findLinkedWalletByAddress(
  chain: WalletChain,
  address: string,
): Promise<LinkedWallet | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('linked_wallets')
    .select('*')
    .eq('chain', chain)
    .eq('address', address)
    .maybeSingle();
  if (error) throw new Error(`findLinkedWalletByAddress: ${error.message}`);
  return data ? mapWallet(data as Record<string, unknown>) : null;
}
