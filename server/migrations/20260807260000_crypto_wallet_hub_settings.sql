-- Seed Crypto Wallet admin settings (Payment Hub)

INSERT INTO public.payment_hub_settings (key, value, updated_at)
VALUES
  ('crypto_deposit_min_ton_nanotons', '100000000'::jsonb, now()),
  ('crypto_deposit_min_usdt_micros', '1000000'::jsonb, now()),
  ('crypto_withdraw_fee_ton_nanotons', '50000000'::jsonb, now()),
  ('crypto_withdraw_fee_usdt_micros', '100000'::jsonb, now()),
  ('crypto_withdraw_min_ton_nanotons', '100000000'::jsonb, now()),
  ('crypto_withdraw_min_usdt_micros', '1000000'::jsonb, now()),
  ('crypto_withdraw_max_ton_nanotons', '1000000000000'::jsonb, now()),
  ('crypto_withdraw_max_usdt_micros', '10000000000'::jsonb, now()),
  ('crypto_withdraw_daily_ton_nanotons', '5000000000000'::jsonb, now()),
  ('crypto_withdraw_daily_usdt_micros', '50000000000'::jsonb, now()),
  ('crypto_deposit_confirmations', '1'::jsonb, now())
ON CONFLICT (key) DO NOTHING;
