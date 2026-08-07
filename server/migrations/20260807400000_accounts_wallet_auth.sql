-- Allow wallet-based web login (TON Connect / EVM).
alter table accounts drop constraint if exists accounts_auth_provider_check;
alter table accounts add constraint accounts_auth_provider_check
  check (auth_provider = any (array['telegram'::text, 'google'::text, 'ton'::text, 'evm'::text]));
