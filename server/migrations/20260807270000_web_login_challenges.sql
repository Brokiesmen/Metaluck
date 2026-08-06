-- One-time web login via Telegram bot deep-link (/start web_<id>).
create table if not exists web_login_challenges (
  id text primary key,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'consumed', 'expired')),
  telegram_id bigint,
  username text,
  first_name text,
  avatar text,
  account_id bigint,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  approved_at timestamptz,
  consumed_at timestamptz
);

create index if not exists web_login_challenges_status_exp_idx
  on web_login_challenges (status, expires_at);
