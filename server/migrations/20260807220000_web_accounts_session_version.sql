-- Web auth accounts + session_version for server-side logout revocation.
-- Idempotent: safe if 20260807120000 already applied locally.

create sequence if not exists web_account_id_seq start with 10000000000;

create table if not exists accounts (
  id              bigint primary key,
  telegram_id     bigint unique,
  google_id       text unique,
  email           text,
  username        text,
  avatar          text,
  auth_provider   text not null check (auth_provider in ('telegram', 'google')),
  session_version integer not null default 0,
  created_at      timestamptz not null default now(),
  last_login      timestamptz not null default now()
);

create index if not exists accounts_email_idx on accounts (email);

create or replace function next_web_account_id()
returns bigint
language sql
as $$ select nextval('web_account_id_seq') $$;

alter table accounts add column if not exists session_version integer not null default 0;

alter table accounts enable row level security;
