import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Client } from 'pg';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const minigamesRoot = path.resolve(__dirname, '../..');
const defaultSourceEnv = path.resolve(minigamesRoot, '../Telegram mini gemes/frog-case-backend/.env');
const sourceEnvPath = process.env.FROG_SOURCE_ENV_PATH || defaultSourceEnv;

if (fs.existsSync(sourceEnvPath)) {
  dotenv.config({ path: sourceEnvPath, override: false });
}

const pgConfig = {
  host: process.env.FROG_PGHOST ?? process.env.PGHOST ?? '127.0.0.1',
  port: Number(process.env.FROG_PGPORT ?? process.env.PGPORT ?? 5432),
  user: process.env.FROG_PGUSER ?? process.env.PGUSER ?? 'postgres',
  password: process.env.FROG_PGPASSWORD ?? process.env.PGPASSWORD ?? '',
  database: process.env.FROG_PGDATABASE ?? process.env.PGDATABASE ?? 'frog_case',
};

const sqlitePath = path.resolve(minigamesRoot, 'server', 'game.db');
const pgClient = new Client(pgConfig);
const sqlite = new Database(sqlitePath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

async function run() {
  console.log('Source PostgreSQL:', `${pgConfig.host}:${pgConfig.port}/${pgConfig.database}`);
  console.log('Target SQLite:', sqlitePath);

  await pgClient.connect();

  const usersResult = await pgClient.query(
    `SELECT id, telegram_id, username, balance_stars, referral_id
     FROM users
     ORDER BY id ASC`,
  );

  const cashbackResult = await pgClient.query(
    `SELECT t.user_id, COALESCE(SUM(t.amount), 0) AS total_earned
     FROM transactions t
     WHERE t.type IN ('ref_bonus', 'ref_cashback')
     GROUP BY t.user_id`,
  );
  const cashbackByInternalUser = new Map(cashbackResult.rows.map((r) => [Number(r.user_id), Number(r.total_earned)]));

  const users = usersResult.rows.map((r) => ({
    internalId: Number(r.id),
    telegramId: Number(r.telegram_id),
    username: String(r.username ?? '').trim(),
    balance: Number(r.balance_stars ?? 0),
    referralInternalId: r.referral_id == null ? null : Number(r.referral_id),
  }));

  const internalToTelegram = new Map(users.map((u) => [u.internalId, u.telegramId]));
  const referredByTelegram = new Map();
  for (const u of users) {
    const referredByTg = u.referralInternalId == null ? null : internalToTelegram.get(u.referralInternalId) ?? null;
    referredByTelegram.set(u.telegramId, referredByTg);
  }

  const referredUsersByTelegram = new Map();
  for (const u of users) {
    const refTg = referredByTelegram.get(u.telegramId);
    if (refTg == null) continue;
    const list = referredUsersByTelegram.get(refTg) ?? [];
    list.push(u.telegramId);
    referredUsersByTelegram.set(refTg, list);
  }

  const upsertBalance = sqlite.prepare(
    `INSERT INTO balances(user_id, balance)
     VALUES(?, ?)
     ON CONFLICT(user_id) DO UPDATE SET balance=excluded.balance`,
  );
  const upsertProfile = sqlite.prepare(
    `INSERT INTO user_profiles(user_id, name, photo_url)
     VALUES(?, ?, NULL)
     ON CONFLICT(user_id) DO UPDATE SET name=excluded.name`,
  );
  const upsertReferral = sqlite.prepare(
    `INSERT INTO referrals(user_id, code, referred_by, referred_users, total_earned)
     VALUES(?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       code=excluded.code,
       referred_by=excluded.referred_by,
       referred_users=excluded.referred_users,
       total_earned=excluded.total_earned`,
  );

  const tx = sqlite.transaction(() => {
    for (const u of users) {
      if (!Number.isFinite(u.telegramId) || u.telegramId <= 0) continue;
      const safeName = u.username || `user_${u.telegramId}`;
      const referredBy = referredByTelegram.get(u.telegramId);
      const referredUsers = referredUsersByTelegram.get(u.telegramId) ?? [];
      const totalEarned = cashbackByInternalUser.get(u.internalId) ?? 0;

      upsertBalance.run(u.telegramId, Math.max(0, u.balance));
      upsertProfile.run(u.telegramId, safeName);
      upsertReferral.run(
        u.telegramId,
        u.telegramId === 0 ? 'refdev' : `ref${u.telegramId}`,
        referredBy,
        JSON.stringify(referredUsers),
        Math.max(0, totalEarned),
      );
    }
  });

  tx();

  console.log(`Imported users: ${users.length}`);
  console.log('Done.');
}

run()
  .catch((err) => {
    console.error('Import failed:', err.message ?? err);
    process.exitCode = 1;
  })
  .finally(async () => {
    sqlite.close();
    await pgClient.end().catch(() => undefined);
  });
