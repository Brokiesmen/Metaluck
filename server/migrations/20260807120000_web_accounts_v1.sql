-- Web auth: единая модель пользователя для входа через браузер
-- (Google + Telegram Login Widget). Mini App продолжает работать по initData и
-- эту таблицу НЕ требует — она нужна только для web-логинов и связывания.
--
-- Идентификатор account.id совместим с существующей экономикой:
--   • для Telegram-пользователей  id = telegram_id  → балансы/профили/история
--     остаются под тем же ключом, миграция данных не нужна;
--   • для «только Google» пользователей id берётся из отдельной
--     последовательности с высоким полом, чтобы никогда не пересечься с
--     диапазоном Telegram-id.

create sequence if not exists web_account_id_seq start with 10000000000;

create table if not exists accounts (
  id            bigint primary key,
  telegram_id   bigint unique,
  google_id     text unique,
  email         text,
  username      text,
  avatar        text,
  auth_provider text not null check (auth_provider in ('telegram', 'google')),
  session_version integer not null default 0,
  created_at    timestamptz not null default now(),
  last_login    timestamptz not null default now()
);

create index if not exists accounts_email_idx on accounts (email);

-- Выдать следующий id для «только Google» аккаунта (supabase-js вызывает через rpc).
create or replace function next_web_account_id()
returns bigint
language sql
as $$ select nextval('web_account_id_seq') $$;
