-- Payment audit log + withdraw reconcile status

CREATE TABLE IF NOT EXISTS public.payment_audit_log (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at       timestamptz NOT NULL DEFAULT now(),
  user_id          bigint,
  operation        text NOT NULL,
  outcome          text NOT NULL
                   CHECK (outcome = ANY (ARRAY[
                     'ok'::text,
                     'rejected'::text,
                     'failed'::text,
                     'skipped'::text,
                     'reconcile'::text
                   ])),
  currency_code    text,
  amount           bigint,
  network          text,
  tx_hash          text,
  idempotency_key  text,
  ref_table        text,
  ref_id           text,
  reason           text,
  meta             jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS payment_audit_log_created_idx
  ON public.payment_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS payment_audit_log_user_idx
  ON public.payment_audit_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS payment_audit_log_op_idx
  ON public.payment_audit_log (operation, created_at DESC);

CREATE INDEX IF NOT EXISTS payment_audit_log_tx_hash_idx
  ON public.payment_audit_log (tx_hash)
  WHERE tx_hash IS NOT NULL;

ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow needs_reconcile for ambiguous on-chain sends (no unlock)
ALTER TABLE public.crypto_withdrawals
  DROP CONSTRAINT IF EXISTS crypto_withdrawals_status_check;

ALTER TABLE public.crypto_withdrawals
  ADD CONSTRAINT crypto_withdrawals_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'processing'::text,
    'completed'::text,
    'failed'::text,
    'needs_reconcile'::text
  ]));
