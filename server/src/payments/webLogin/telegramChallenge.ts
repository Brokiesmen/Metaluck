/**
 * Telegram bot deep-link login challenges (web → t.me/bot?start=web_<id> → poll).
 */

import crypto from 'crypto';
import { getSupabase } from '../../supabaseStore.js';
import { upsertTelegramAccount, issueSessionToken, publicUser, getAccountById, type Account } from '../../webAuth.js';

const TTL_MS = 10 * 60 * 1000;
const ID_BYTES = 18;

export type ChallengeStatus = 'pending' | 'approved' | 'consumed' | 'expired';

export interface LoginChallenge {
  id: string;
  status: ChallengeStatus;
  telegram_id: number | null;
  username: string | null;
  first_name: string | null;
  avatar: string | null;
  account_id: number | null;
  expires_at: string;
}

function mapRow(r: Record<string, unknown>): LoginChallenge {
  return {
    id: String(r.id),
    status: String(r.status) as ChallengeStatus,
    telegram_id: r.telegram_id == null ? null : Number(r.telegram_id),
    username: r.username == null ? null : String(r.username),
    first_name: r.first_name == null ? null : String(r.first_name),
    avatar: r.avatar == null ? null : String(r.avatar),
    account_id: r.account_id == null ? null : Number(r.account_id),
    expires_at: String(r.expires_at),
  };
}

function newChallengeId(): string {
  return crypto.randomBytes(ID_BYTES).toString('base64url');
}

/** Prefix in /start payload — keep short (Telegram start param max 64). */
export const WEB_LOGIN_START_PREFIX = 'web_';

export function parseWebLoginStartPayload(text: string): string | null {
  const raw = String(text ?? '').trim();
  const m = raw.match(/^\/start(?:@\w+)?\s+(web_[A-Za-z0-9_-]{16,64})\s*$/i);
  if (!m) return null;
  const full = m[1];
  if (!full.toLowerCase().startsWith(WEB_LOGIN_START_PREFIX)) return null;
  return full.slice(WEB_LOGIN_START_PREFIX.length);
}

export async function createLoginChallenge(): Promise<{ id: string; expiresAt: string }> {
  const sb = getSupabase();
  const id = newChallengeId();
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
  const { error } = await sb.from('web_login_challenges').insert({
    id,
    status: 'pending',
    expires_at: expiresAt,
  });
  if (error) throw new Error(`createLoginChallenge: ${error.message}`);
  return { id, expiresAt };
}

export async function getLoginChallenge(id: string): Promise<LoginChallenge | null> {
  if (!id || id.length > 80) return null;
  const sb = getSupabase();
  const { data, error } = await sb.from('web_login_challenges').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`getLoginChallenge: ${error.message}`);
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function approveLoginChallenge(
  id: string,
  tg: {
    id: number;
    username?: string | null;
    firstName?: string | null;
    avatar?: string | null;
  },
): Promise<{ ok: true; account: Account } | { ok: false; reason: string }> {
  const row = await getLoginChallenge(id);
  if (!row) return { ok: false, reason: 'not_found' };
  if (row.status === 'consumed') return { ok: false, reason: 'consumed' };
  if (row.status === 'expired' || Date.parse(row.expires_at) < Date.now()) {
    await expireChallenge(id);
    return { ok: false, reason: 'expired' };
  }
  if (row.status === 'approved' && row.telegram_id === tg.id) {
    const acc = await upsertTelegramAccount({
      id: tg.id,
      username: tg.username,
      name: tg.firstName,
      avatar: tg.avatar,
    });
    return { ok: true, account: acc };
  }
  if (row.status !== 'pending') return { ok: false, reason: 'invalid' };

  const acc = await upsertTelegramAccount({
    id: tg.id,
    username: tg.username,
    name: tg.firstName,
    avatar: tg.avatar,
  });

  const sb = getSupabase();
  const { data, error } = await sb
    .from('web_login_challenges')
    .update({
      status: 'approved',
      telegram_id: tg.id,
      username: tg.username ?? null,
      first_name: tg.firstName ?? null,
      avatar: tg.avatar ?? null,
      account_id: acc.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`approveLoginChallenge: ${error.message}`);
  if (!data) return { ok: false, reason: 'race' };
  return { ok: true, account: acc };
}

async function expireChallenge(id: string): Promise<void> {
  const sb = getSupabase();
  await sb
    .from('web_login_challenges')
    .update({ status: 'expired' })
    .eq('id', id)
    .eq('status', 'pending');
}

/**
 * Poll / claim: if approved → issue session once and mark consumed.
 */
export async function claimLoginChallenge(
  id: string,
): Promise<
  | { status: 'pending' }
  | { status: 'expired' }
  | { status: 'ready'; token: string; user: ReturnType<typeof publicUser> }
> {
  const row = await getLoginChallenge(id);
  if (!row) return { status: 'expired' };
  if (row.status === 'consumed') return { status: 'expired' };
  if (row.status === 'expired' || Date.parse(row.expires_at) < Date.now()) {
    if (row.status === 'pending') await expireChallenge(id);
    return { status: 'expired' };
  }
  if (row.status === 'pending') return { status: 'pending' };
  if (row.status !== 'approved' || !row.account_id) return { status: 'expired' };

  const sb = getSupabase();
  const { data, error } = await sb
    .from('web_login_challenges')
    .update({
      status: 'consumed',
      consumed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'approved')
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`claimLoginChallenge: ${error.message}`);
  if (!data) {
    // already consumed by parallel poll
    return { status: 'expired' };
  }

  const acc = await getAccountById(row.account_id);
  if (!acc) return { status: 'expired' };
  return {
    status: 'ready',
    token: issueSessionToken(acc),
    user: publicUser(acc),
  };
}

export function webAppPublicUrl(): string | null {
  const explicit = String(process.env.WEB_APP_URL ?? process.env.PUBLIC_WEB_URL ?? '')
    .trim()
    .replace(/\/$/, '');
  if (explicit) return explicit;
  // Fallback: Vercel production hostname from .env.example homepage pattern
  const fromCors = String(process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .find((s) => /^https:\/\//i.test(s) && !/telegram\.org/i.test(s));
  return fromCors ? fromCors.replace(/\/$/, '') : null;
}

export function telegramBotDeepLink(challengeId: string): string | null {
  const bot = String(process.env.TELEGRAM_BOT_USERNAME ?? '')
    .trim()
    .replace(/^@/, '');
  if (!bot || !challengeId) return null;
  return `https://t.me/${bot}?start=${WEB_LOGIN_START_PREFIX}${challengeId}`;
}
