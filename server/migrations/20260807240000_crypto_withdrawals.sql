-- Crypto Withdrawal Service
CREATE TABLE IF NOT EXISTS public.crypto_withdrawals (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id         text NOT NULL UNIQUE,
  user_id           bigint NOT NULL,
  network           text NOT NULL DEFAULT 'ton'
                    CHECK (network = 'ton'),
  currency_code     text NOT NULL
                    CHECK (currency_code = ANY (ARRAY['TON'::text, 'USDT_TON'::text])),
  to_address        text NOT NULL,
  to_address_raw    text NOT NULL,
  -- Gross amount locked/debited from wallet (minor units)
  amount            bigint NOT NULL CHECK (amount > 0),
  -- Network fee charged from amount (same currency minor units)
  network_fee       bigint NOT NULL CHECK (network_fee >= 0),
  -- Amount actually sent on-chain (amount - network_fee)
  net_amount        bigint NOT NULL CHECK (net_amount > 0),
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status = ANY (ARRAY[
                      'pending'::text,
                      'processing'::text,
                      'completed'::text,
                      'failed'::text
                    ])),
  tx_hash           text,
  error_message     text,
  confirmed_by_user boolean NOT NULL DEFAULT true,
  processed_at      timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crypto_withdrawals_net_check CHECK (net_amount = amount - network_fee)
);

CREATE UNIQUE INDEX IF NOT EXISTS crypto_withdrawals_tx_hash_uidx
  ON public.crypto_withdrawals (network, tx_hash)
  WHERE tx_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS crypto_withdrawals_user_created_idx
  ON public.crypto_withdrawals (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS crypto_withdrawals_status_idx
  ON public.crypto_withdrawals (status, created_at)
  WHERE status IN ('pending', 'processing');

ALTER TABLE public.crypto_withdrawals ENABLE ROW LEVEL SECURITY;
