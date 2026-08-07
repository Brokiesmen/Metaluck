// Применить один .sql файл к Postgres (Supabase) напрямую.
// Использование:
//   node scripts/apply-migration.mjs ../migrations/20260807300000_linked_wallets.sql
// Строка подключения берётся из SUPABASE_DB_URL (или DATABASE_URL).
// URI: Supabase → Project Settings → Database → Connection string → "URI".

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .env лежит в корне репозитория (../../.env относительно server/scripts)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString =
  process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '';
if (!connectionString) {
  console.error('❌ SUPABASE_DB_URL (или DATABASE_URL) не задан. Добавьте его в .env.');
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error('❌ Укажите путь к .sql файлу: node scripts/apply-migration.mjs <file.sql>');
  process.exit(1);
}
const sqlPath = path.resolve(process.cwd(), file);
const sql = fs.readFileSync(sqlPath, 'utf8');

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log(`▶ применяю ${path.basename(sqlPath)} …`);
  await client.query(sql);
  console.log('✅ миграция применена');
} catch (err) {
  console.error('❌ ошибка:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await client.end();
}
