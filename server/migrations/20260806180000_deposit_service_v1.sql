-- Deposit Service v1 (Supabase: deposit_service_v1)
-- Universal deposit_orders for Telegram Stars / TON / USDT_TON

CREATE TABLE IF NOT EXISTS public.deposit_orders (
  id bigserial PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  user_id bigint NOT NULL,
  rail text NOT NULL CHECK (rail = ANY (ARRAY['telegram_stars'::text, 'ton'::text, 'usdt_ton'::text])),
  currency_code text NOT NULL REFERENCES public.currencies (code),
  product_kind text NOT NULL DEFAULT 'wallet_credit'
    CHECK (product_kind = ANY (ARRAY['wallet_credit'::text, 'premium_wheel'::text])),
  expected_amount bigint NOT NULL CHECK (expected_amount >= 0),
  received_amount bigint CHECK (received_amount IS NULL OR received_amount >= 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY['pending'::text, 'confirming'::text, 'paid'::text, 'failed'::text, 'expired'::text])),
  external_id text,
  package_id text,
  deposit_address text,
  memo text,
  confirmations integer NOT NULL DEFAULT 0 CHECK (confirmations >= 0),
  required_confirmations integer NOT NULL DEFAULT 1 CHECK (required_confirmations >= 1),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS deposit_orders_external_id_uidx
  ON public.deposit_orders (external_id)
  WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS deposit_orders_active_memo_uidx
  ON public.deposit_orders (rail, memo)
  WHERE memo IS NOT NULL AND status IN ('pending', 'confirming');

CREATE INDEX IF NOT EXISTS deposit_orders_user_created_idx
  ON public.deposit_orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS deposit_orders_status_rail_idx
  ON public.deposit_orders (status, rail)
  WHERE status IN ('pending', 'confirming');

ALTER TABLE public.deposit_orders ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.deposit_claim_paid(
  p_public_id text,
  p_external_id text,
  p_received_amount bigint,
  p_confirmations integer DEFAULT NULL,
  p_meta jsonb DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  public_id text,
  user_id bigint,
  rail text,
  currency_code text,
  product_kind text,
  expected_amount bigint,
  received_amount bigint,
  status text,
  package_id text,
  meta jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_row public.deposit_orders%ROWTYPE;
BEGIN
  IF p_public_id IS NULL OR p_external_id IS NULL OR p_external_id = '' THEN
    RAISE EXCEPTION 'invalid_claim';
  END IF;
  IF p_received_amount IS NULL OR p_received_amount < 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  SELECT * INTO v_row FROM public.deposit_orders d
  WHERE d.public_id = p_public_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_row.status = 'paid' THEN
    IF v_row.external_id = p_external_id THEN
      id := v_row.id;
      public_id := v_row.public_id;
      user_id := v_row.user_id;
      rail := v_row.rail;
      currency_code := v_row.currency_code;
      product_kind := v_row.product_kind;
      expected_amount := v_row.expected_amount;
      received_amount := v_row.received_amount;
      status := v_row.status;
      package_id := v_row.package_id;
      meta := v_row.meta;
      RETURN NEXT;
    END IF;
    RETURN;
  END IF;

  IF v_row.status NOT IN ('pending', 'confirming') THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.deposit_orders x
    WHERE x.external_id = p_external_id AND x.public_id <> p_public_id
  ) THEN
    RAISE EXCEPTION 'external_id_taken';
  END IF;

  UPDATE public.deposit_orders d
  SET status = 'paid',
      external_id = p_external_id,
      received_amount = p_received_amount,
      confirmations = COALESCE(p_confirmations, d.confirmations),
      meta = CASE WHEN p_meta IS NULL THEN d.meta ELSE d.meta || p_meta END,
      updated_at = now()
  WHERE d.public_id = p_public_id
    AND d.status IN ('pending', 'confirming')
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  id := v_row.id;
  public_id := v_row.public_id;
  user_id := v_row.user_id;
  rail := v_row.rail;
  currency_code := v_row.currency_code;
  product_kind := v_row.product_kind;
  expected_amount := v_row.expected_amount;
  received_amount := v_row.received_amount;
  status := v_row.status;
  package_id := v_row.package_id;
  meta := v_row.meta;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.deposit_mark_confirming(
  p_public_id text,
  p_external_id text,
  p_received_amount bigint,
  p_confirmations integer
)
RETURNS TABLE (id bigint, status text, confirmations integer)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.deposit_orders d
  SET status = 'confirming',
      external_id = COALESCE(d.external_id, p_external_id),
      received_amount = COALESCE(p_received_amount, d.received_amount),
      confirmations = GREATEST(d.confirmations, COALESCE(p_confirmations, 0)),
      updated_at = now()
  WHERE d.public_id = p_public_id
    AND d.status IN ('pending', 'confirming')
  RETURNING d.id, d.status, d.confirmations;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deposit_claim_paid(text, text, bigint, integer, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.deposit_mark_confirming(text, text, bigint, integer) TO service_role;
