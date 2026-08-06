-- Align claim RPC + index with public statuses: pending | confirmed | failed

DROP INDEX IF EXISTS public.crypto_chain_tx_status_idx;
CREATE INDEX IF NOT EXISTS crypto_chain_tx_status_idx
  ON public.crypto_chain_transactions (status, updated_at)
  WHERE status IN ('pending', 'detected', 'confirming');

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

  -- Already confirmed (or legacy credited)
  IF v_row.status IN ('confirmed', 'credited') THEN
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

  IF v_row.status NOT IN ('pending', 'detected', 'confirming') THEN
    RETURN;
  END IF;

  IF v_row.confirmations < v_row.required_confirmations THEN
    RETURN;
  END IF;

  UPDATE public.crypto_chain_transactions t
  SET status = 'confirmed',
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
