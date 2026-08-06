/**
 * Рассылка сообщений пользователям, которые нажали /start у бота.
 *
 * Примеры:
 *   npm run broadcast -- --text "Привет! Новая Арена уже в Metaluck"
 *   npm run broadcast -- --text "…" --button "Открыть" --dry-run
 *
 * Нужны env: TELEGRAM_BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Опционально: TELEGRAM_BOT_USERNAME, TELEGRAM_MINI_APP_PATH
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return null;
  return process.argv[i + 1] ?? null;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function miniAppUrl() {
  const username = String(process.env.TELEGRAM_BOT_USERNAME ?? '').trim().replace(/^@/, '');
  if (!username) return null;
  const pathPart = String(process.env.TELEGRAM_MINI_APP_PATH ?? 'app').trim().replace(/^\/+|\/+$/g, '') || 'app';
  return `https://t.me/${username}/${pathPart}`;
}

async function main() {
  const text = arg('text');
  if (!text) {
    console.error('Usage: npm run broadcast -- --text "Your message" [--button "Open"] [--dry-run]');
    process.exit(1);
  }

  const token = String(process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
  const supabaseUrl = String(process.env.SUPABASE_URL ?? '').trim();
  const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!token || !supabaseUrl || !supabaseKey) {
    console.error('Missing TELEGRAM_BOT_TOKEN / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const dryRun = hasFlag('dry-run');
  const buttonLabel = arg('button') ?? 'Играть';
  const appUrl = miniAppUrl();

  const sb = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from('bot_chats')
    .select('chat_id')
    .eq('blocked', false)
    .limit(20_000);
  if (error) throw error;

  const chatIds = (data ?? []).map((r) => Number(r.chat_id)).filter((id) => id > 0);
  console.log(`Recipients: ${chatIds.length}${dryRun ? ' (dry-run)' : ''}`);

  const replyMarkup = appUrl
    ? { inline_keyboard: [[{ text: buttonLabel, url: appUrl }]] }
    : undefined;

  let ok = 0;
  let fail = 0;
  let blocked = 0;

  for (const chatId of chatIds) {
    if (dryRun) {
      ok += 1;
      continue;
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: replyMarkup,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!json.ok) {
        fail += 1;
        const desc = String(json.description ?? '');
        if (json.error_code === 403 || /blocked|deactivated|not found/i.test(desc)) {
          blocked += 1;
          await sb.from('bot_chats').update({ blocked: true, updated_at: new Date().toISOString() }).eq('chat_id', chatId);
        }
        console.warn(`fail ${chatId}: ${desc}`);
      } else {
        ok += 1;
      }
    } catch (e) {
      fail += 1;
      console.warn(`fail ${chatId}:`, e);
    }
    // ~25 msg/sec soft limit for bots
    await sleep(40);
  }

  console.log(JSON.stringify({ ok, fail, blocked, total: chatIds.length, dryRun }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
