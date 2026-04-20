import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const token = String(process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
const secret = String(process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN ?? '').trim();
const webhookUrl = String(process.env.TELEGRAM_WEBHOOK_URL ?? process.argv[2] ?? '').trim();

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is empty in .env');
  process.exit(1);
}
if (!secret) {
  console.error('TELEGRAM_WEBHOOK_SECRET_TOKEN is empty in .env');
  process.exit(1);
}
if (!webhookUrl) {
  console.error('Provide webhook URL: npm run webhook:set -- https://<domain>/api/telegram/webhook');
  process.exit(1);
}
if (!webhookUrl.startsWith('https://')) {
  console.error('Webhook URL must start with https://');
  process.exit(1);
}

const body = {
  url: webhookUrl,
  secret_token: secret,
  allowed_updates: ['message', 'pre_checkout_query'],
};

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const json = await response.json().catch(() => ({}));

if (!json.ok) {
  console.error('setWebhook failed:', json.description ?? response.statusText);
  process.exit(1);
}

console.log('Webhook set successfully.');
console.log('URL:', webhookUrl);
console.log('Secret set: yes, length =', secret.length);
