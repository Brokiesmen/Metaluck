-- Crypto Wallet Service: per-user TON deposit addresses + chain tx tracking.
-- Credits go through existing wallets / wallet_ledger (no separate balance).

CREATE TABLE IF NOT EXISTS public.crypto_deposit_addresses (
  id                bigserial PRIMARY KEY,
  user_id           bigint NOT NULL,
  network           text NOT NULL DEFAULT 'ton' CHECK (network = 'ton'),
  address           text NOT NULL,
  address_raw       text NOT NULL,
  derivation_version integer NOT NULL DEFAULT 1,
  last_lt           text,
  last_scanned_at   timestamptz,
  last_requested_at timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, network),
  UNIQUE (address),
  UNIQUE (address_raw)
);

CREATE INDEX IF NOT EXISTS crypto_deposit_addresses_active_idx
  ON public.crypto_deposit_addresses (last_requested_at DESC);

CREATE TABLE IF NOT EXISTS public.crypto_chain_transactions (
  id                bigserial PRIMARY KEY,
  public_id         text NOT NULL UNIQUE,
  user_id           bigint NOT NULL,
  network           text NOT NULL DEFAULT 'ton',
  currency_code     text NOT NULL REFERENCES public.currencies (code),
  tx_hash           text NOT NULL,
  lt                text,
  from_address      text,
  to_address        text NOT NULL,
  amount            bigint NOT NULL CHECK (amount > 0),
  confirmations     integer NOT NULL DEFAULT 0 CHECK (confirmations >= 0),
  required_confirmations integer NOT NULL DEFAULT 1 CHECK (required_confirmations >= 1),
  status            text NOT NULL DEFAULT 'detected'
    CHECK (status = ANY (ARRAY[
      'detected'::text,
      'confirming'::text,
      'credited'::text,
      'ignored'::text,
      'failed'::text
    ])),
  deposit_address_id bigint REFERENCES public.crypto_deposit_addresses (id),
  memo              text,
  error_message     text,
  meta              jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at       timestamptz NOT NULL DEFAULT now(),
  credited_at       timestamptz,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (network, tx_hash, currency_code)
);

CREATE INDEX IF NOT EXISTS crypto_chain_tx_user_idx
  ON public.crypto_chain_transactions (user_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS crypto_chain_tx_status_idx
  ON public.crypto_chain_transactions (status, updated_at)
  WHERE status IN ('detected', 'confirming');

ALTER TABLE public.crypto_deposit_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_chain_transactions ENABLE ROW LEVEL SECURITY;

-- Atomic claim: detected/confirming → credited (idempotent on same row).
CREATE OR REPLACE FUNCTION public.crypto_tx_claim_credit(p_public_id text)
RETURNS TABLE (
  id bigint,
  public_id text,
  user_id bigint,
  currency_code text,
  amount bigint,
  status text,
  tx_hash text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_row public.crypto_chain_transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.crypto_chain_transactions t
  WHERE t.public_id = p_public_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_row.status = 'credited' THEN
    id := v_row.id;
    public_id := v_row.public_id;
    user_id := v_row.user_id;
    currency_code := v_row.currency_code;
    amount := v_row.amount;
    status := v_row.status;
    tx_hash := v_row.tx_hash;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_row.status NOT IN ('detected', 'confirming') THEN
    RETURN;
  END IF;

  IF v_row.confirmations < v_row.required_confirmations THEN
    RETURN;
  END IF;

  UPDATE public.crypto_chain_transactions t
  SET status = 'credited',
      credited_at = now(),
      updated_at = now()
  WHERE t.public_id = p_public_id
  RETURNING * INTO v_row;

  id := v_row.id;
  public_id := v_row.public_id;
  user_id := v_row.user_id;
  currency_code := v_row.currency_code;
  amount := v_row.amount;
  status := v_row.status;
  tx_hash := v_row.tx_hash;
  RETURN NEXT;
END;
$$;
