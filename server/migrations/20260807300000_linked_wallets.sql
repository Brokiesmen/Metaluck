-- Linked wallets: привязка внешнего кошелька (TON / EVM) к существующему
-- аккаунту (web-логин ИЛИ Telegram Mini App). Это НЕ метод входа — вход
-- остаётся Google / Telegram; здесь только доказанное владение адресом.
--
-- account_id — это тот же id, что возвращает getUserId(req):
--   • для Telegram Mini App  = telegram_id (строки в accounts может не быть);
--   • для web-аккаунта       = accounts.id.
-- Поэтому FK на accounts НЕ ставим (Mini App users отсутствуют в accounts).

create table if not exists linked_wallets (
  id           bigserial primary key,
  account_id   bigint not null,
  chain        text   not null check (chain in ('ton', 'evm')),
  address      text   not null,              -- TON: raw 0:hex (нормализованный); EVM: lowercase 0x…
  address_display text,                       -- человекочитаемый (TON: EQ…/UQ…; EVM: checksummed)
  public_key   text,                          -- ed25519 hex (TON ton_proof); для EVM null
  verified_at  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  unique (chain, address),                    -- один адрес не привязать к двум аккаунтам
  unique (account_id, chain)                  -- один адрес на чейн на аккаунт (перепривязка = update)
);

create index if not exists linked_wallets_account_idx on linked_wallets (account_id);

-- Короткоживущие challenge-nonce для доказательства владения (ton_proof / SIWE).
create table if not exists wallet_link_challenges (
  id          text primary key,               -- случайный nonce (base64url)
  account_id  bigint not null,                -- кому выдан
  chain       text   not null check (chain in ('ton', 'evm')),
  status      text   not null default 'pending' check (status in ('pending', 'consumed', 'expired')),
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  consumed_at timestamptz
);

create index if not exists wallet_link_challenges_expiry_idx on wallet_link_challenges (expires_at);
