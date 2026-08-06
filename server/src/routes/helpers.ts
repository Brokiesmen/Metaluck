import type { FastifyRequest } from 'fastify';
import crypto from 'crypto';
import type { Prize } from '../types.js';

const ADMIN_API_SECRET = String(process.env.ADMIN_API_SECRET ?? '').trim();

export interface HistoryEntry {
  caseId: number;
  caseName: string;
  prize: Prize;
  timestamp: number;
}

export type GetUserId = (req: FastifyRequest) => Promise<number>;

export function httpError(statusCode: number, message: string): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode });
}

export function miniAppUrl(): string | null {
  const username = String(process.env.TELEGRAM_BOT_USERNAME ?? '').trim().replace(/^@/, '');
  if (!username) return null;
  const pathPart =
    String(process.env.TELEGRAM_MINI_APP_PATH ?? 'app').trim().replace(/^\/+|\/+$/g, '') || 'app';
  return `https://t.me/${username}/${pathPart}`;
}

export function verifyAdminSecret(req: FastifyRequest): boolean {
  if (!ADMIN_API_SECRET) return false;
  const got = String(req.headers['x-admin-secret'] ?? '').trim();
  if (!got) return false;
  const a = Buffer.from(got, 'utf8');
  const b = Buffer.from(ADMIN_API_SECRET, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function telegramApiUrl(method: string): string {
  const token = String(process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }
  return `https://api.telegram.org/bot${token}/${method}`;
}

export async function telegramJsonMethod<T = unknown>(
  method: string,
  body: Record<string, unknown>,
  timeoutMs = 7000,
): Promise<T> {
  const res = await fetch(telegramApiUrl(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string; result?: T };
  if (!data.ok) {
    throw new Error(data.description ?? 'Telegram API error');
  }
  return data.result as T;
}
