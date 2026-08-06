-- Payment Hub Admin: runtime settings, admins, audit log (no code deploys for config).

CREATE TABLE IF NOT EXISTS public.payment_hub_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by bigint
);

CREATE TABLE IF NOT EXISTS public.payment_hub_admins (
  user_id bigint PRIMARY KEY,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by bigint
);

CREATE TABLE IF NOT EXISTS public.payment_hub_audit (
  id bigserial PRIMARY KEY,
  actor_id bigint,
  action text NOT NULL,
  target text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_hub_audit_created_idx
  ON public.payment_hub_audit (created_at DESC);

ALTER TABLE public.payment_hub_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_hub_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_hub_audit ENABLE ROW LEVEL SECURITY;

INSERT INTO public.payment_hub_settings (key, value) VALUES
  ('withdraw_min_stars', '100'::jsonb),
  ('withdraw_presets', '[100,250,500,1000,5000]'::jsonb),
  ('deposit_min_stars', '25'::jsonb),
  ('deposit_min_ton_nanotons', '100000000'::jsonb),
  ('deposit_min_usdt_micros', '1000000'::jsonb),
  ('stars_usd', '0.015'::jsonb),
  ('stars_usd_manual', 'false'::jsonb),
  ('exchange_quote_ttl_ms', '30000'::jsonb),
  ('rates_refresh_ms', '60000'::jsonb)
ON CONFLICT (key) DO NOTHING;
