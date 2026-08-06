-- Persist exchange_execute_quote RPC (was live-only; required for exchange execute path).

CREATE OR REPLACE FUNCTION public.exchange_execute_quote(p_quote_id uuid, p_user_id bigint)
 RETURNS TABLE(order_id bigint, quote_id uuid, from_currency text, to_currency text, from_amount bigint, to_amount bigint, fee_amount bigint, fee_currency text, effective_rate numeric, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_q public.exchange_quotes%ROWTYPE;
  v_ord public.exchange_orders%ROWTYPE;
  v_deb record;
  v_cred record;
BEGIN
  IF p_quote_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_args';
  END IF;

  SELECT * INTO v_q FROM public.exchange_quotes q WHERE q.id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'quote_not_found';
  END IF;
  IF v_q.user_id <> p_user_id THEN
    RAISE EXCEPTION 'quote_forbidden';
  END IF;

  -- Idempotent replay
  IF v_q.status = 'executed' THEN
    SELECT * INTO v_ord FROM public.exchange_orders o WHERE o.quote_id = p_quote_id;
    IF FOUND THEN
      order_id := v_ord.id;
      quote_id := v_ord.quote_id;
      from_currency := v_ord.from_currency;
      to_currency := v_ord.to_currency;
      from_amount := v_ord.from_amount;
      to_amount := v_ord.to_amount;
      fee_amount := v_ord.fee_amount;
      fee_currency := v_ord.fee_currency;
      effective_rate := v_ord.effective_rate;
      created_at := v_ord.created_at;
      RETURN NEXT;
      RETURN;
    END IF;
    RAISE EXCEPTION 'quote_executed_missing_order';
  END IF;

  IF v_q.status <> 'open' THEN
    RAISE EXCEPTION 'quote_not_open';
  END IF;
  IF v_q.expires_at <= now() THEN
    UPDATE public.exchange_quotes SET status = 'expired' WHERE id = p_quote_id AND status = 'open';
    RAISE EXCEPTION 'quote_expired';
  END IF;

  SELECT * INTO v_deb FROM public.wallet_try_debit(
    p_user_id,
    v_q.from_currency,
    v_q.from_amount,
    'exchange',
    'exchange_debit:' || p_quote_id::text,
    'exchange_quotes',
    p_quote_id::text,
    jsonb_build_object('side', 'debit', 'to', v_q.to_currency)
  );
  IF v_deb.available IS NULL THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  SELECT * INTO v_cred FROM public.wallet_credit(
    p_user_id,
    v_q.to_currency,
    v_q.to_amount,
    'exchange',
    'exchange_credit:' || p_quote_id::text,
    'exchange_quotes',
    p_quote_id::text,
    jsonb_build_object(
      'side', 'credit',
      'from', v_q.from_currency,
      'fee_amount', v_q.fee_amount,
      'fee_currency', v_q.fee_currency
    )
  );
  IF v_cred.available IS NULL THEN
    RAISE EXCEPTION 'credit_failed';
  END IF;

  UPDATE public.exchange_quotes
  SET status = 'executed',
      executed_at = now()
  WHERE id = p_quote_id;

  INSERT INTO public.exchange_orders (
    quote_id, user_id, from_currency, to_currency,
    from_amount, to_amount, fee_amount, fee_currency, effective_rate
  ) VALUES (
    p_quote_id, p_user_id, v_q.from_currency, v_q.to_currency,
    v_q.from_amount, v_q.to_amount, v_q.fee_amount, v_q.fee_currency, v_q.effective_rate
  )
  RETURNING * INTO v_ord;

  order_id := v_ord.id;
  quote_id := v_ord.quote_id;
  from_currency := v_ord.from_currency;
  to_currency := v_ord.to_currency;
  from_amount := v_ord.from_amount;
  to_amount := v_ord.to_amount;
  fee_amount := v_ord.fee_amount;
  fee_currency := v_ord.fee_currency;
  effective_rate := v_ord.effective_rate;
  created_at := v_ord.created_at;
  RETURN NEXT;
END;
$function$;
