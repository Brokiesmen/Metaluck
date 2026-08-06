-- Wallet Service v1 (Payment Hub)
-- Applied remotely as: wallet_service_v1 (20260806174646)
-- Currencies: STARS, TON, USDT_TON — available + locked + ledger
-- Legacy balances.* dual-written for STARS; add_balance / try_deduct_balance route through wallet_*

-- ── Catalog ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.currencies (
  code text PRIMARY KEY,
  kind text NOT NULL CHECK (kind = ANY (ARRAY['internal'::text, 'crypto'::text, 'fiat_rail'::text])),
  decimals integer NOT NULL DEFAULT 0 CHECK (decimals >= 0 AND decimals <= 18),
  network text,
  display_symbol text NOT NULL,
  can_deposit boolean NOT NULL DEFAULT false,
  can_withdraw boolean NOT NULL DEFAULT false,
  can_exchange boolean NOT NULL DEFAULT false,
  can_wager boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100
);

INSERT INTO public.currencies (
  code, kind, decimals, network, display_symbol,
  can_deposit, can_withdraw, can_exchange, can_wager, is_active, sort_order
) VALUES
  ('STARS', 'internal', 0, NULL, '★', true, true, true, true, true, 10),
  ('TON', 'crypto', 9, 'ton', 'TON', true, true, true, false, true, 20),
  ('USDT_TON', 'crypto', 6, 'ton', 'USDT', true, true, true, false, true, 30)
ON CONFLICT (code) DO UPDATE SET
  kind = EXCLUDED.kind,
  decimals = EXCLUDED.decimals,
  network = EXCLUDED.network,
  display_symbol = EXCLUDED.display_symbol,
  can_deposit = EXCLUDED.can_deposit,
  can_withdraw = EXCLUDED.can_withdraw,
  can_exchange = EXCLUDED.can_exchange,
  can_wager = EXCLUDED.can_wager,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- ── Wallets ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.wallets (
  user_id bigint NOT NULL,
  currency_code text NOT NULL REFERENCES public.currencies (code),
  available bigint NOT NULL DEFAULT 0 CHECK (available >= 0),
  locked bigint NOT NULL DEFAULT 0 CHECK (locked >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, currency_code)
);

CREATE INDEX IF NOT EXISTS wallets_user_idx
  ON public.wallets (user_id);
CREATE INDEX IF NOT EXISTS wallets_currency_available_idx
  ON public.wallets (currency_code, available DESC);

-- ── Ledger ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL,
  currency_code text NOT NULL REFERENCES public.currencies (code),
  direction text NOT NULL CHECK (direction = ANY (ARRAY['credit'::text, 'debit'::text])),
  amount bigint NOT NULL CHECK (amount > 0),
  available_after bigint NOT NULL CHECK (available_after >= 0),
  locked_after bigint NOT NULL CHECK (locked_after >= 0),
  entry_type text NOT NULL,
  idempotency_key text,
  ref_table text,
  ref_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_idempotency_uidx
  ON public.wallet_ledger (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS wallet_ledger_user_created_idx
  ON public.wallet_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wallet_ledger_user_currency_created_idx
  ON public.wallet_ledger (user_id, currency_code, created_at DESC);

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

-- ── RPCs ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.wallet_ensure(p_user_id bigint)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_user';
  END IF;
  INSERT INTO public.wallets (user_id, currency_code, available, locked)
  SELECT p_user_id, c.code, 0, 0
  FROM public.currencies c
  WHERE c.code IN ('STARS', 'TON', 'USDT_TON') AND c.is_active
  ON CONFLICT (user_id, currency_code) DO NOTHING;

  INSERT INTO public.balances (user_id, balance, coupons)
  VALUES (p_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_get(p_user_id bigint, p_currency text)
RETURNS TABLE(available bigint, locked bigint)
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.wallet_ensure(p_user_id);
  RETURN QUERY
  SELECT w.available, w.locked
  FROM public.wallets w
  WHERE w.user_id = p_user_id AND w.currency_code = p_currency;
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_credit(
  p_user_id bigint,
  p_currency text,
  p_amount bigint,
  p_entry_type text DEFAULT 'credit',
  p_idempotency_key text DEFAULT NULL,
  p_ref_table text DEFAULT NULL,
  p_ref_id text DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(available bigint, locked bigint)
LANGUAGE plpgsql
AS $$
DECLARE
  v_available bigint;
  v_locked bigint;
  v_existing_id bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  IF p_currency IS NULL OR p_currency NOT IN ('STARS', 'TON', 'USDT_TON') THEN
    RAISE EXCEPTION 'invalid_currency';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT l.id INTO v_existing_id
    FROM public.wallet_ledger l
    WHERE l.idempotency_key = p_idempotency_key
    LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      PERFORM public.wallet_ensure(p_user_id);
      RETURN QUERY
      SELECT w.available, w.locked
      FROM public.wallets w
      WHERE w.user_id = p_user_id AND w.currency_code = p_currency;
      RETURN;
    END IF;
  END IF;

  PERFORM public.wallet_ensure(p_user_id);

  UPDATE public.wallets w
  SET available = w.available + p_amount,
      updated_at = now()
  WHERE w.user_id = p_user_id AND w.currency_code = p_currency
  RETURNING w.available, w.locked INTO v_available, v_locked;

  IF v_available IS NULL THEN
    RAISE EXCEPTION 'wallet_missing';
  END IF;

  INSERT INTO public.wallet_ledger (
    user_id, currency_code, direction, amount,
    available_after, locked_after, entry_type,
    idempotency_key, ref_table, ref_id, meta
  ) VALUES (
    p_user_id, p_currency, 'credit', p_amount,
    v_available, v_locked, COALESCE(NULLIF(p_entry_type, ''), 'credit'),
    p_idempotency_key, p_ref_table, p_ref_id, COALESCE(p_meta, '{}'::jsonb)
  );

  IF p_currency = 'STARS' THEN
    UPDATE public.balances SET balance = v_available WHERE user_id = p_user_id;
  END IF;

  available := v_available;
  locked := v_locked;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_try_debit(
  p_user_id bigint,
  p_currency text,
  p_amount bigint,
  p_entry_type text DEFAULT 'debit',
  p_idempotency_key text DEFAULT NULL,
  p_ref_table text DEFAULT NULL,
  p_ref_id text DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(available bigint, locked bigint)
LANGUAGE plpgsql
AS $$
DECLARE
  v_available bigint;
  v_locked bigint;
  v_existing_id bigint;
BEGIN
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  IF p_currency IS NULL OR p_currency NOT IN ('STARS', 'TON', 'USDT_TON') THEN
    RAISE EXCEPTION 'invalid_currency';
  END IF;

  PERFORM public.wallet_ensure(p_user_id);

  IF p_idempotency_key IS NOT NULL THEN
    SELECT l.id INTO v_existing_id
    FROM public.wallet_ledger l
    WHERE l.idempotency_key = p_idempotency_key
    LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      RETURN QUERY
      SELECT w.available, w.locked
      FROM public.wallets w
      WHERE w.user_id = p_user_id AND w.currency_code = p_currency;
      RETURN;
    END IF;
  END IF;

  IF p_amount = 0 THEN
    RETURN QUERY
    SELECT w.available, w.locked
    FROM public.wallets w
    WHERE w.user_id = p_user_id AND w.currency_code = p_currency;
    RETURN;
  END IF;

  UPDATE public.wallets w
  SET available = w.available - p_amount,
      updated_at = now()
  WHERE w.user_id = p_user_id
    AND w.currency_code = p_currency
    AND w.available >= p_amount
  RETURNING w.available, w.locked INTO v_available, v_locked;

  IF v_available IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.wallet_ledger (
    user_id, currency_code, direction, amount,
    available_after, locked_after, entry_type,
    idempotency_key, ref_table, ref_id, meta
  ) VALUES (
    p_user_id, p_currency, 'debit', p_amount,
    v_available, v_locked, COALESCE(NULLIF(p_entry_type, ''), 'debit'),
    p_idempotency_key, p_ref_table, p_ref_id, COALESCE(p_meta, '{}'::jsonb)
  );

  IF p_currency = 'STARS' THEN
    UPDATE public.balances SET balance = v_available WHERE user_id = p_user_id;
  END IF;

  available := v_available;
  locked := v_locked;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_lock(
  p_user_id bigint,
  p_currency text,
  p_amount bigint,
  p_entry_type text DEFAULT 'lock',
  p_idempotency_key text DEFAULT NULL,
  p_ref_table text DEFAULT NULL,
  p_ref_id text DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(available bigint, locked bigint)
LANGUAGE plpgsql
AS $$
DECLARE
  v_available bigint;
  v_locked bigint;
  v_existing_id bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  PERFORM public.wallet_ensure(p_user_id);

  IF p_idempotency_key IS NOT NULL THEN
    SELECT l.id INTO v_existing_id FROM public.wallet_ledger l WHERE l.idempotency_key = p_idempotency_key LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      RETURN QUERY SELECT w.available, w.locked FROM public.wallets w
      WHERE w.user_id = p_user_id AND w.currency_code = p_currency;
      RETURN;
    END IF;
  END IF;

  UPDATE public.wallets w
  SET available = w.available - p_amount,
      locked = w.locked + p_amount,
      updated_at = now()
  WHERE w.user_id = p_user_id
    AND w.currency_code = p_currency
    AND w.available >= p_amount
  RETURNING w.available, w.locked INTO v_available, v_locked;

  IF v_available IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.wallet_ledger (
    user_id, currency_code, direction, amount,
    available_after, locked_after, entry_type,
    idempotency_key, ref_table, ref_id, meta
  ) VALUES (
    p_user_id, p_currency, 'debit', p_amount,
    v_available, v_locked, COALESCE(NULLIF(p_entry_type, ''), 'lock'),
    p_idempotency_key, p_ref_table, p_ref_id, COALESCE(p_meta, '{}'::jsonb)
  );

  IF p_currency = 'STARS' THEN
    UPDATE public.balances SET balance = v_available WHERE user_id = p_user_id;
  END IF;

  available := v_available;
  locked := v_locked;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_unlock(
  p_user_id bigint,
  p_currency text,
  p_amount bigint,
  p_entry_type text DEFAULT 'unlock',
  p_idempotency_key text DEFAULT NULL,
  p_ref_table text DEFAULT NULL,
  p_ref_id text DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(available bigint, locked bigint)
LANGUAGE plpgsql
AS $$
DECLARE
  v_available bigint;
  v_locked bigint;
  v_existing_id bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  PERFORM public.wallet_ensure(p_user_id);

  IF p_idempotency_key IS NOT NULL THEN
    SELECT l.id INTO v_existing_id FROM public.wallet_ledger l WHERE l.idempotency_key = p_idempotency_key LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      RETURN QUERY SELECT w.available, w.locked FROM public.wallets w
      WHERE w.user_id = p_user_id AND w.currency_code = p_currency;
      RETURN;
    END IF;
  END IF;

  UPDATE public.wallets w
  SET available = w.available + p_amount,
      locked = w.locked - p_amount,
      updated_at = now()
  WHERE w.user_id = p_user_id
    AND w.currency_code = p_currency
    AND w.locked >= p_amount
  RETURNING w.available, w.locked INTO v_available, v_locked;

  IF v_available IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.wallet_ledger (
    user_id, currency_code, direction, amount,
    available_after, locked_after, entry_type,
    idempotency_key, ref_table, ref_id, meta
  ) VALUES (
    p_user_id, p_currency, 'credit', p_amount,
    v_available, v_locked, COALESCE(NULLIF(p_entry_type, ''), 'unlock'),
    p_idempotency_key, p_ref_table, p_ref_id, COALESCE(p_meta, '{}'::jsonb)
  );

  IF p_currency = 'STARS' THEN
    UPDATE public.balances SET balance = v_available WHERE user_id = p_user_id;
  END IF;

  available := v_available;
  locked := v_locked;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_capture_locked(
  p_user_id bigint,
  p_currency text,
  p_amount bigint,
  p_entry_type text DEFAULT 'withdraw_capture',
  p_idempotency_key text DEFAULT NULL,
  p_ref_table text DEFAULT NULL,
  p_ref_id text DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(available bigint, locked bigint)
LANGUAGE plpgsql
AS $$
DECLARE
  v_available bigint;
  v_locked bigint;
  v_existing_id bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  PERFORM public.wallet_ensure(p_user_id);

  IF p_idempotency_key IS NOT NULL THEN
    SELECT l.id INTO v_existing_id FROM public.wallet_ledger l WHERE l.idempotency_key = p_idempotency_key LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      RETURN QUERY SELECT w.available, w.locked FROM public.wallets w
      WHERE w.user_id = p_user_id AND w.currency_code = p_currency;
      RETURN;
    END IF;
  END IF;

  UPDATE public.wallets w
  SET locked = w.locked - p_amount,
      updated_at = now()
  WHERE w.user_id = p_user_id
    AND w.currency_code = p_currency
    AND w.locked >= p_amount
  RETURNING w.available, w.locked INTO v_available, v_locked;

  IF v_available IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.wallet_ledger (
    user_id, currency_code, direction, amount,
    available_after, locked_after, entry_type,
    idempotency_key, ref_table, ref_id, meta
  ) VALUES (
    p_user_id, p_currency, 'debit', p_amount,
    v_available, v_locked, COALESCE(NULLIF(p_entry_type, ''), 'withdraw_capture'),
    p_idempotency_key, p_ref_table, p_ref_id, COALESCE(p_meta, '{}'::jsonb)
  );

  available := v_available;
  locked := v_locked;
  RETURN NEXT;
END;
$$;

-- Legacy STARS API → wallet (dual-write stays inside wallet_*)

CREATE OR REPLACE FUNCTION public.ensure_balance_row(p_user_id bigint)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.wallet_ensure(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_balance(p_user_id bigint, p_delta integer)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_bal integer;
  row_w record;
BEGIN
  IF p_delta IS NULL OR p_delta = 0 THEN
    PERFORM public.wallet_ensure(p_user_id);
    SELECT available INTO new_bal FROM public.wallets
    WHERE user_id = p_user_id AND currency_code = 'STARS';
    RETURN COALESCE(new_bal, 0);
  END IF;

  IF p_delta > 0 THEN
    SELECT * INTO row_w FROM public.wallet_credit(p_user_id, 'STARS', p_delta::bigint, 'legacy_add_balance');
    RETURN row_w.available::integer;
  END IF;

  SELECT * INTO row_w FROM public.wallet_try_debit(p_user_id, 'STARS', ABS(p_delta)::bigint, 'legacy_add_balance');
  IF row_w.available IS NULL THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;
  RETURN row_w.available::integer;
END;
$$;

CREATE OR REPLACE FUNCTION public.try_deduct_balance(p_user_id bigint, p_amount integer)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  row_w record;
BEGIN
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  SELECT * INTO row_w FROM public.wallet_try_debit(p_user_id, 'STARS', p_amount::bigint, 'legacy_try_deduct');
  IF NOT FOUND OR row_w.available IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN row_w.available::integer;
END;
$$;

-- Backfill STARS from legacy balances; ensure TON / USDT rows for existing users
INSERT INTO public.wallets (user_id, currency_code, available, locked)
SELECT b.user_id, 'STARS', GREATEST(0, b.balance)::bigint, 0
FROM public.balances b
ON CONFLICT (user_id, currency_code) DO UPDATE
SET available = GREATEST(public.wallets.available, EXCLUDED.available),
    updated_at = now()
WHERE public.wallets.available < EXCLUDED.available;

INSERT INTO public.wallets (user_id, currency_code, available, locked)
SELECT b.user_id, c.code, 0, 0
FROM public.balances b
CROSS JOIN (VALUES ('TON'), ('USDT_TON')) AS c(code)
ON CONFLICT (user_id, currency_code) DO NOTHING;

GRANT EXECUTE ON FUNCTION public.wallet_ensure(bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.wallet_get(bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wallet_credit(bigint, text, bigint, text, text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.wallet_try_debit(bigint, text, bigint, text, text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.wallet_lock(bigint, text, bigint, text, text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.wallet_unlock(bigint, text, bigint, text, text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.wallet_capture_locked(bigint, text, bigint, text, text, text, text, jsonb) TO service_role;
