import crypto from 'crypto';

interface AuthResult {
  valid: boolean;
  userId: number;
  user: Record<string, unknown> | null;
}

/**
 * Validates Telegram WebApp initData using HMAC-SHA256.
 * If BOT_TOKEN is not set → dev mode (skip validation, userId = 0).
 *
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(initData: string | undefined): AuthResult {
  const DEV: AuthResult = { valid: true, userId: 0, user: null };

  // No initData → dev mode
  if (!initData) return DEV;

  const params = new URLSearchParams(initData);
  const userStr = params.get('user');
  const user = userStr ? (JSON.parse(userStr) as Record<string, unknown>) : null;
  const userId = typeof user?.id === 'number' ? user.id : 0;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  // Bot token not configured → skip validation but use parsed ID (dev mode)
  if (!botToken) {
    return { valid: true, userId, user };
  }

  const hash = params.get('hash');
  if (!hash) return { valid: false, userId: 0, user: null };

  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const expected = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (expected !== hash) return { valid: false, userId: 0, user: null };

  return { valid: true, userId, user };
}
