import crypto from 'crypto';
import { PREMIUM_WHEEL_PACKAGE_ID, PREMIUM_WHEEL_XTR } from '../../wheel.js';
import { telegramJsonMethod } from '../../routes/helpers.js';

export const TOPUP_PACKAGES = [
  { id: 'xtr_25', xtrAmount: 25, balanceAmount: 25, label: '25 звёзд', popular: false },
  { id: 'xtr_50', xtrAmount: 50, balanceAmount: 50, label: '50 звёзд', popular: true },
  { id: 'xtr_100', xtrAmount: 100, balanceAmount: 100, label: '100 звёзд', popular: false },
  { id: 'xtr_500', xtrAmount: 500, balanceAmount: 500, label: '500 звёзд', popular: false },
] as const;

export const PREMIUM_WHEEL_PACKAGE = {
  id: PREMIUM_WHEEL_PACKAGE_ID,
  xtrAmount: PREMIUM_WHEEL_XTR,
  balanceAmount: 0,
  label: 'Премиум фортуна ×1',
  popular: false,
} as const;

export const PRE_CHECKOUT_DEADLINE_MS = Math.min(
  9700,
  Math.max(2500, Number(process.env.PRE_CHECKOUT_DEADLINE_MS ?? 9000)),
);

export function getTopupPackageById(packageId: string) {
  return TOPUP_PACKAGES.find((p) => p.id === packageId) ?? null;
}

export function getInvoicePackageById(packageId: string) {
  if (packageId === PREMIUM_WHEEL_PACKAGE.id) return PREMIUM_WHEEL_PACKAGE;
  return getTopupPackageById(packageId);
}

export function buildTopupPayload(userId: number, packageId: string): string {
  const nonce = crypto.randomBytes(6).toString('hex');
  const payload = `mg:1:${userId}:${packageId}:${nonce}`;
  if (payload.length > 128) {
    throw new Error('Invoice payload too long');
  }
  return payload;
}

export function parseTopupPayload(payload: string) {
  const parts = String(payload ?? '').split(':');
  if (parts.length !== 5 || parts[0] !== 'mg' || parts[1] !== '1') {
    throw new Error('INVALID_PAYLOAD');
  }
  const userId = Number(parts[2]);
  const packageId = parts[3];
  if (!Number.isFinite(userId) || userId <= 0 || !getInvoicePackageById(packageId)) {
    throw new Error('INVALID_PAYLOAD');
  }
  return { userId, packageId };
}

export async function createTopupInvoiceLink(
  _userId: number,
  pkg: { label: string; balanceAmount: number; xtrAmount: number },
  payload: string,
) {
  const isWheel = pkg.balanceAmount === 0;
  const body: Record<string, unknown> = {
    title: isWheel ? 'Премиум фортуна' : `Пополнение ${pkg.label}`,
    description: isWheel
      ? `1 вращение премиум-колеса за ${pkg.xtrAmount} Telegram Stars.`
      : `Пополнение баланса на ${pkg.balanceAmount} звёзд за ${pkg.xtrAmount} XTR.`,
    payload,
    currency: 'XTR',
    provider_token: '',
    prices: [{ label: pkg.label, amount: pkg.xtrAmount }],
  };
  const photoUrl = String(process.env.STARS_INVOICE_PHOTO_URL ?? '').trim();
  if (photoUrl) {
    body.photo_url = photoUrl;
  }
  return telegramJsonMethod<string>('createInvoiceLink', body);
}

export async function answerPreCheckoutQuery(
  preCheckoutQueryId: string,
  ok: boolean,
  opts: { error_message?: string } = {},
) {
  return telegramJsonMethod(
    'answerPreCheckoutQuery',
    {
      pre_checkout_query_id: preCheckoutQueryId,
      ok,
      ...opts,
    },
    5000,
  );
}
