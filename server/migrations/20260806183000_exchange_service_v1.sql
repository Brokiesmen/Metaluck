-- Exchange Service v1 (Supabase: exchange_service_v1)
-- market_rates, exchange_pairs, exchange_quotes, exchange_orders + exchange_execute_quote RPC
-- Balances move only via wallet_try_debit / wallet_credit (Transaction Service path).

CREATE TABLE IF NOT EXISTS public.market_rates (
  base_currency text NOT NULL REFERENCES public.currencies (code),
  quote_currency text NOT NULL REFERENCES public.currencies (code),
  mid numeric NOT NULL CHECK (mid > 0),
  bid numeric NOT NULL CHECK (bid > 0),
  ask numeric NOT NULL CHECK (ask > 0),
  spread_bps integer NOT NULL DEFAULT 0 CHECK (spread_bps >= 0),
  source text NOT NULL DEFAULT 'coingecko',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (base_currency, quote_currency),
  CHECK (base_currency <> quote_currency)
);

CREATE TABLE IF NOT EXISTS public.exchange_pairs (
  from_currency text NOT NULL REFERENCES public.currencies (code),
  to_currency text NOT NULL REFERENCES public.currencies (code),
  spread_bps integer NOT NULL DEFAULT 100 CHECK (spread_bps >= 0),
  fee_bps integer NOT NULL DEFAULT 50 CHECK (fee_bps >= 0),
  min_from_amount bigint NOT NULL CHECK (min_from_amount > 0),
  max_from_amount bigint NOT NULL CHECK (max_from_amount >= min_from_amount),
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (from_currency, to_currency),
  CHECK (from_currency <> to_currency)
);

INSERT INTO public.exchange_pairs (
  from_currency, to_currency, spread_bps, fee_bps, min_from_amount, max_from_amount
) VALUES
  ('STARS', 'TON', 100, 50, 10, 100000),
  ('TON', 'STARS', 100, 50, 100000000, 100000000000),
  ('TON', 'USDT_TON', 80, 40, 100000000, 100000000000),
  ('USDT_TON', 'TON', 80, 40, 1000000, 10000000000),
  ('STARS', 'USDT_TON', 100, 50, 10, 100000),
  ('USDT_TON', 'STARS', 100, 50, 1000000, 10000000000)
ON CONFLICT (from_currency, to_currency) DO UPDATE SET
  spread_bps = EXCLUDED.spread_bps,
  fee_bps = EXCLUDED.fee_bps,
  min_from_amount = EXCLUDED.min_from_amount,
  max_from_amount = EXCLUDED.max_from_amount,
  is_active = true,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.exchange_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL,
  from_currency text NOT NULL REFERENCES public.currencies (code),
  to_currency text NOT NULL REFERENCES public.currencies (code),
  from_amount bigint NOT NULL CHECK (from_amount > 0),
  to_amount bigint NOT NULL CHECK (to_amount > 0),
  fee_amount bigint NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  fee_currency text NOT NULL REFERENCES public.currencies (code),
  mid_rate numeric NOT NULL,
  effective_rate numeric NOT NULL,
  spread_bps integer NOT NULL,
  fee_bps integer NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status = ANY (ARRAY['open'::text, 'executed'::text, 'expired'::text, 'cancelled'::text])),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS exchange_quotes_user_created_idx
  ON public.exchange_quotes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS exchange_quotes_open_expires_idx
  ON public.exchange_quotes (status, expires_at)
  WHERE status = 'open';

CREATE TABLE IF NOT EXISTS public.exchange_orders (
  id bigserial PRIMARY KEY,
  quote_id uuid NOT NULL UNIQUE REFERENCES public.exchange_quotes (id),
  user_id bigint NOT NULL,
  from_currency text NOT NULL REFERENCES public.currencies (code),
  to_currency text NOT NULL REFERENCES public.currencies (code),
  from_amount bigint NOT NULL CHECK (from_amount > 0),
  to_amount bigint NOT NULL CHECK (to_amount > 0),
  fee_amount bigint NOT NULL DEFAULT 0,
  fee_currency text NOT NULL REFERENCES public.currencies (code),
  effective_rate numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exchange_orders_user_created_idx
  ON public.exchange_orders (user_id, created_at DESC);

ALTER TABLE public.market_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_orders ENABLE ROW LEVEL SECURITY;

-- RPC exchange_execute_quote: see live DB / apply via Supabase MCP (calls wallet_try_debit + wallet_credit).
