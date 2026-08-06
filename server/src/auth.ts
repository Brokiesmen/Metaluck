import crypto from 'crypto';

interface AuthResult {
  valid: boolean;
  userId: number;
  user: Record<string, unknown> | null;
  startParam: string | null;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Validates Telegram WebApp initData using HMAC-SHA256.
 * Dev (no BOT_TOKEN / non-production): may skip HMAC and allow missing initData.
 * Production: TELEGRAM_BOT_TOKEN required; invalid/missing initData → unauthorized.
 *
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(initData: string | undefined): AuthResult {
  const DEV: AuthResult = { valid: true, userId: 0, user: null, startParam: null };
  const FAIL: AuthResult = { valid: false, userId: 0, user: null, startParam: null };
  const botToken = String(process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
  const prod = isProduction();

  if (!initData) {
    if (prod && botToken) return FAIL;
    if (prod) return FAIL;
    return DEV;
  }

  const params = new URLSearchParams(initData);
  const userStr = params.get('user');
  let user: Record<string, unknown> | null = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr) as Record<string, unknown>;
    } catch {
      return FAIL;
    }
  }
  const userId = typeof user?.id === 'number' ? user.id : 0;
  const startParam = params.get('start_param');

  if (!botToken) {
    if (prod) return FAIL;
    return { valid: true, userId, user, startParam };
  }

  const hash = params.get('hash');
  if (!hash) return FAIL;

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

  if (expected !== hash) return FAIL;

  return { valid: true, userId, user, startParam };
}
