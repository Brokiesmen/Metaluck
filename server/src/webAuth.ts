import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import type { FastifyRequest } from 'fastify';
import { getSupabase } from './supabaseStore.js';

/**
 * Web-авторизация (Google + Telegram Login Widget) поверх существующей модели.
 *
 * Bearer HMAC-сессия (не cookie): клиент и API на разных доменах.
 * Формат токена: base64url({aid,sv,exp}).base64url(hmacSHA256(secret, payload)).
 * `sv` = accounts.session_version — logout инкрементит sv → старые токены мёртвы.
 */

export interface Account {
  id: number;
  telegram_id: number | null;
  google_id: string | null;
  email: string | null;
  username: string | null;
  avatar: string | null;
  auth_provider: 'telegram' | 'google' | 'ton' | 'evm';
  session_version: number;
  created_at: string;
  last_login: string;
}

export interface SessionClaims {
  aid: number;
  sv: number;
  exp: number;
}

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 дней
/** Скользящее обновление: если до exp меньше этого — выдаём новый токен. */
const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

let _secretCache: string | null = null;
function sessionSecret(): string {
  if (_secretCache) return _secretCache;
  const s = String(process.env.SESSION_SECRET ?? '').trim();
  if (s) {
    _secretCache = s;
    return s;
  }
  if (isProduction()) {
    throw new Error('SESSION_SECRET is required in production');
  }
  const bot = String(process.env.TELEGRAM_BOT_TOKEN ?? 'metaluck-dev').trim();
  _secretCache = crypto.createHash('sha256').update(`session:${bot}`).digest('hex');
  return _secretCache;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ba.length === 0 || ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function signSession(
  accountId: number,
  sessionVersion: number,
  ttlMs = TOKEN_TTL_MS,
): string {
  const payload = b64url(
    Buffer.from(
      JSON.stringify({
        aid: accountId,
        sv: Math.trunc(sessionVersion) || 0,
        exp: Date.now() + ttlMs,
      } satisfies SessionClaims),
    ),
  );
  const sig = b64url(crypto.createHmac('sha256', sessionSecret()).update(payload).digest());
  return `${payload}.${sig}`;
}

/** Проверка подписи + exp. Без сверки session_version (см. accountFromRequest). */
export function parseSession(token: string | undefined | null): SessionClaims | null {
  if (!token || token.length > 2048) return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payload || !sig) return null;
  const expected = b64url(crypto.createHmac('sha256', sessionSecret()).update(payload).digest());
  if (!timingSafeEqualStr(sig, expected)) return null;
  try {
    const raw = JSON.parse(b64urlDecode(payload).toString('utf8')) as Partial<SessionClaims>;
    const aid = Number(raw.aid);
    const exp = Number(raw.exp);
    const sv = Number(raw.sv ?? 0);
    if (!Number.isFinite(aid) || aid <= 0) return null;
    if (!Number.isFinite(exp) || Date.now() > exp) return null;
    if (!Number.isFinite(sv) || sv < 0) return null;
    return { aid: Math.trunc(aid), sv: Math.trunc(sv), exp };
  } catch {
    return null;
  }
}

/** @deprecated use parseSession — оставлено для совместимости внутренних импортов. */
export function verifySession(token: string | undefined | null): number | null {
  return parseSession(token)?.aid ?? null;
}

export function shouldRefreshSession(claims: SessionClaims): boolean {
  return claims.exp - Date.now() < REFRESH_WINDOW_MS;
}

export function bearerToken(req: FastifyRequest): string | null {
  const raw = req.headers['authorization'];
  if (!raw || typeof raw !== 'string') return null;
  const m = /^Bearer\s+(\S+)$/i.exec(raw.trim());
  return m ? m[1] : null;
}

function publicUser(a: Account) {
  return {
    id: a.id,
    telegramId: a.telegram_id,
    googleId: a.google_id,
    email: a.email,
    username: a.username,
    avatar: a.avatar,
    authProvider: a.auth_provider,
  };
}
export type PublicUser = ReturnType<typeof publicUser>;
export { publicUser };

function mapAccount(row: Record<string, unknown>): Account {
  return {
    id: Number(row.id),
    telegram_id: row.telegram_id == null ? null : Number(row.telegram_id),
    google_id: row.google_id == null ? null : String(row.google_id),
    email: row.email == null ? null : String(row.email),
    username: row.username == null ? null : String(row.username),
    avatar: row.avatar == null ? null : String(row.avatar),
    auth_provider:
      row.auth_provider === 'google'
        ? 'google'
        : row.auth_provider === 'ton'
          ? 'ton'
          : row.auth_provider === 'evm'
            ? 'evm'
            : 'telegram',
    session_version: Number(row.session_version ?? 0) || 0,
    created_at: String(row.created_at ?? ''),
    last_login: String(row.last_login ?? ''),
  };
}

export async function getAccountById(id: number): Promise<Account | null> {
  const sb = getSupabase();
  const { data, error } = await sb.from('accounts').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`getAccountById: ${error.message}`);
  return data ? mapAccount(data as Record<string, unknown>) : null;
}

async function touchLastLogin(id: number): Promise<void> {
  const sb = getSupabase();
  await sb.from('accounts').update({ last_login: new Date().toISOString() }).eq('id', id);
}

/** Инкремент session_version — все ранее выданные Bearer-токены перестают работать. */
export async function bumpSessionVersion(accountId: number): Promise<number> {
  const sb = getSupabase();
  const acc = await getAccountById(accountId);
  if (!acc) throw new Error('Account not found');
  const next = acc.session_version + 1;
  const { data, error } = await sb
    .from('accounts')
    .update({ session_version: next, last_login: new Date().toISOString() })
    .eq('id', accountId)
    .eq('session_version', acc.session_version)
    .select('session_version')
    .maybeSingle();
  if (error) throw new Error(`bumpSessionVersion: ${error.message}`);
  // CAS miss → перечитать
  if (!data) {
    const again = await getAccountById(accountId);
    return again?.session_version ?? next;
  }
  return Number(data.session_version);
}

async function nextGoogleAccountId(): Promise<number> {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('next_web_account_id');
  if (error) throw new Error(`next_web_account_id: ${error.message}`);
  const id = Number(data);
  if (!Number.isFinite(id) || id <= 0) throw new Error('next_web_account_id: bad id');
  return id;
}

export async function upsertTelegramAccount(tg: {
  id: number;
  username?: string | null;
  name?: string | null;
  avatar?: string | null;
}): Promise<Account> {
  const sb = getSupabase();
  const existing = await getAccountById(tg.id);
  const username = tg.username || tg.name || `tg${tg.id}`;
  if (existing) {
    const { data, error } = await sb
      .from('accounts')
      .update({
        telegram_id: tg.id,
        username,
        avatar: tg.avatar ?? existing.avatar ?? null,
        last_login: new Date().toISOString(),
      })
      .eq('id', tg.id)
      .select('*')
      .single();
    if (error) throw new Error(`upsertTelegramAccount update: ${error.message}`);
    return mapAccount(data as Record<string, unknown>);
  }
  const { data, error } = await sb
    .from('accounts')
    .insert({
      id: tg.id,
      telegram_id: tg.id,
      username,
      avatar: tg.avatar ?? null,
      auth_provider: 'telegram',
      session_version: 0,
    })
    .select('*')
    .single();
  if (error) throw new Error(`upsertTelegramAccount insert: ${error.message}`);
  return mapAccount(data as Record<string, unknown>);
}

/**
 * Google: строго по google_id. Email НЕ склеивает с Telegram-аккаунтом
 * (сценарий «два аккаунта» — намеренно раздельные личности).
 */
export async function upsertGoogleAccount(g: {
  googleId: string;
  email?: string | null;
  name?: string | null;
  avatar?: string | null;
}): Promise<Account> {
  const sb = getSupabase();
  const { data: found, error: findErr } = await sb
    .from('accounts')
    .select('*')
    .eq('google_id', g.googleId)
    .maybeSingle();
  if (findErr) throw new Error(`upsertGoogleAccount find: ${findErr.message}`);

  if (found) {
    const acc = mapAccount(found as Record<string, unknown>);
    const { data, error } = await sb
      .from('accounts')
      .update({
        email: g.email ?? acc.email ?? null,
        username: g.name || acc.username || (g.email ? g.email.split('@')[0] : `g${acc.id}`),
        avatar: g.avatar ?? acc.avatar ?? null,
        last_login: new Date().toISOString(),
      })
      .eq('id', acc.id)
      .select('*')
      .single();
    if (error) throw new Error(`upsertGoogleAccount update: ${error.message}`);
    return mapAccount(data as Record<string, unknown>);
  }

  const id = await nextGoogleAccountId();
  const { data, error } = await sb
    .from('accounts')
    .insert({
      id,
      google_id: g.googleId,
      email: g.email ?? null,
      username: g.name || (g.email ? g.email.split('@')[0] : `g${id}`),
      avatar: g.avatar ?? null,
      auth_provider: 'google',
      session_version: 0,
    })
    .select('*')
    .single();
  if (error) throw new Error(`upsertGoogleAccount insert: ${error.message}`);
  return mapAccount(data as Record<string, unknown>);
}

/**
 * Вход / регистрация по кошельку (TON или EVM).
 * Если адрес уже в linked_wallets → логиним связанный аккаунт (создаём accounts при необходимости).
 * Иначе → новый web-аккаунт + привязка адреса.
 */
export async function upsertWalletAccount(input: {
  chain: 'ton' | 'evm';
  address: string;
  addressDisplay?: string | null;
  publicKey?: string | null;
}): Promise<Account> {
  const sb = getSupabase();
  const { data: linked, error: findErr } = await sb
    .from('linked_wallets')
    .select('*')
    .eq('chain', input.chain)
    .eq('address', input.address)
    .maybeSingle();
  if (findErr) throw new Error(`upsertWalletAccount find: ${findErr.message}`);

  if (linked) {
    const accountId = Number(linked.account_id);
    let acc = await getAccountById(accountId);
    if (!acc) {
      const short =
        input.addressDisplay ||
        (input.address.length > 12
          ? `${input.address.slice(0, 6)}…${input.address.slice(-4)}`
          : input.address);
      const { data, error } = await sb
        .from('accounts')
        .insert({
          id: accountId,
          username: short,
          auth_provider: input.chain,
          session_version: 0,
          last_login: new Date().toISOString(),
        })
        .select('*')
        .single();
      if (error) throw new Error(`upsertWalletAccount ensure: ${error.message}`);
      acc = mapAccount(data as Record<string, unknown>);
    } else {
      await touchLastLogin(acc.id);
      acc = (await getAccountById(acc.id)) ?? acc;
    }
    // Обновим display/pubkey
    await sb
      .from('linked_wallets')
      .update({
        address_display: input.addressDisplay ?? linked.address_display,
        public_key: input.publicKey ?? linked.public_key,
        verified_at: new Date().toISOString(),
      })
      .eq('id', linked.id);
    return acc;
  }

  const id = await nextGoogleAccountId();
  const short =
    input.addressDisplay ||
    (input.address.length > 12
      ? `${input.address.slice(0, 6)}…${input.address.slice(-4)}`
      : input.address);
  const { data, error } = await sb
    .from('accounts')
    .insert({
      id,
      username: short,
      auth_provider: input.chain,
      session_version: 0,
      last_login: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw new Error(`upsertWalletAccount insert: ${error.message}`);
  const acc = mapAccount(data as Record<string, unknown>);

  const { error: linkErr } = await sb.from('linked_wallets').insert({
    account_id: acc.id,
    chain: input.chain,
    address: input.address,
    address_display: input.addressDisplay ?? null,
    public_key: input.publicKey ?? null,
    verified_at: new Date().toISOString(),
  });
  if (linkErr) throw new Error(`upsertWalletAccount link: ${linkErr.message}`);
  return acc;
}

let googleClient: OAuth2Client | null = null;
function getGoogleClient(): OAuth2Client {
  const clientId = String(process.env.GOOGLE_CLIENT_ID ?? '').trim();
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not configured');
  if (!googleClient) googleClient = new OAuth2Client(clientId);
  return googleClient;
}

export async function verifyGoogleCredential(idToken: string): Promise<{
  googleId: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
}> {
  if (!idToken || idToken.length > 8192) throw new Error('Invalid Google token');
  const clientId = String(process.env.GOOGLE_CLIENT_ID ?? '').trim();
  const client = getGoogleClient();
  const ticket = await client.verifyIdToken({ idToken, audience: clientId });
  const p = ticket.getPayload();
  if (!p?.sub) throw new Error('Invalid Google token');
  // Не доверяем email без email_verified (OAuth callback / GIS id_token).
  const email =
    p.email && p.email_verified === true ? p.email : null;
  return {
    googleId: p.sub,
    email,
    name: p.name ?? null,
    avatar: p.picture ?? null,
  };
}

/**
 * Telegram Login Widget:
 * secret = SHA256(bot_token); hash = HMAC-SHA256(secret, data_check_string).
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramLogin(
  payload: Record<string, string | number | undefined>,
): { id: number; username: string | null; name: string | null; avatar: string | null } {
  const botToken = String(process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
  if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is not configured');

  const hash = String(payload.hash ?? '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error('Missing hash');

  const authDate = Number(payload.auth_date ?? 0);
  if (!authDate || !Number.isFinite(authDate)) throw new Error('Auth data expired');
  // Виджет: данные не старше 24ч
  if (Date.now() / 1000 - authDate > 86400) throw new Error('Auth data expired');
  // Защита от «будущего» auth_date (часы клиента)
  if (authDate - Date.now() / 1000 > 300) throw new Error('Auth data expired');

  const dataCheckString = Object.keys(payload)
    .filter((k) => k !== 'hash' && payload[k] !== undefined && payload[k] !== null)
    .sort()
    .map((k) => `${k}=${payload[k]}`)
    .join('\n');

  const secret = crypto.createHash('sha256').update(botToken).digest();
  const expected = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  if (!timingSafeEqualHex(hash, expected)) {
    throw new Error('Invalid Telegram signature');
  }

  const id = Number(payload.id);
  if (!Number.isFinite(id) || id <= 0) throw new Error('Invalid Telegram id');
  const first = String(payload.first_name ?? '').trim();
  const last = String(payload.last_name ?? '').trim();
  const name = [first, last].filter(Boolean).join(' ') || null;
  return {
    id,
    username: payload.username ? String(payload.username) : null,
    name,
    avatar: payload.photo_url ? String(payload.photo_url) : null,
  };
}

export type AccountFromRequestOpts = {
  /** Обновлять last_login (только на login / refresh, не на каждый API-запрос). */
  touchLogin?: boolean;
};

/**
 * Аккаунт из Bearer. Сверяет session_version — после logout старый токен отвергается.
 */
export async function accountFromRequest(
  req: FastifyRequest,
  opts: AccountFromRequestOpts = {},
): Promise<Account | null> {
  const claims = parseSession(bearerToken(req));
  if (!claims) return null;
  const acc = await getAccountById(claims.aid);
  if (!acc) return null;
  if (acc.session_version !== claims.sv) return null;
  if (opts.touchLogin) {
    void touchLastLogin(acc.id).catch(() => {});
  }
  return acc;
}

export function issueSessionToken(acc: Account): string {
  return signSession(acc.id, acc.session_version);
}
