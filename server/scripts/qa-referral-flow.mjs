import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const base = 'http://127.0.0.1:3001';
const botToken = String(process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
if (!botToken) {
  throw new Error('TELEGRAM_BOT_TOKEN is empty in .env');
}

function makeInitData(userId, firstName, startParam) {
  const params = new URLSearchParams();
  params.set('user', JSON.stringify({ id: userId, first_name: firstName }));
  if (startParam) params.set('start_param', startParam);
  params.set('auth_date', String(Math.floor(Date.now() / 1000)));

  const dataCheck = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secret).update(dataCheck).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

async function request(path, initData, method = 'GET', body) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': initData,
    },
    body,
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: response.status, json };
}

async function run() {
  const refId = 91000101;
  const userId = 91000102;
  const refCode = `ref${refId}`;

  const refInit = makeInitData(refId, 'Ref');
  const userInit = makeInitData(userId, 'Usr', refCode);

  const out = {};
  out.refStatusBefore = await request('/api/referral/status', refInit);
  out.userStatusBefore = await request('/api/referral/status', userInit);
  out.userBalanceTrigger = await request('/api/balance', userInit);
  out.refStatusAfter = await request('/api/referral/status', refInit);
  out.userStatusAfter = await request('/api/referral/status', userInit);
  await request('/api/balance', userInit);
  out.refStatusAfterSecondHit = await request('/api/referral/status', refInit);
  out.userManualActivateAgain = await request(
    '/api/referral/activate',
    userInit,
    'POST',
    JSON.stringify({ code: refCode }),
  );

  console.log(JSON.stringify(out, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
