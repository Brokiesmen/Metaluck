import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const token = String(process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is empty in .env');
  process.exit(1);
}

const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
const json = await response.json().catch(() => ({}));

if (!json.ok) {
  console.error('getWebhookInfo failed:', json.description ?? response.statusText);
  process.exit(1);
}

const info = json.result ?? {};
console.log('url:', info.url || '(not set)');
console.log('pending_update_count:', info.pending_update_count ?? 0);
if (info.last_error_message) {
  console.log('last_error_date:', info.last_error_date ?? '');
  console.log('last_error_message:', info.last_error_message);
}
console.log('secret in .env:', String(process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN ?? '').trim() ? 'set' : 'empty');
