-- Crypto deposit statuses: pending | confirmed | failed (+ legacy aliases during rollout)

ALTER TABLE public.crypto_chain_transactions
  DROP CONSTRAINT IF EXISTS crypto_chain_transactions_status_check;

ALTER TABLE public.crypto_chain_transactions
  ADD CONSTRAINT crypto_chain_transactions_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'confirmed'::text,
    'failed'::text,
    -- legacy (mapped by app)
    'detected'::text,
    'confirming'::text,
    'credited'::text,
    'ignored'::text
  ]));

-- Normalize existing rows to the public status set
UPDATE public.crypto_chain_transactions
SET status = 'pending', updated_at = now()
WHERE status IN ('detected', 'confirming');

UPDATE public.crypto_chain_transactions
SET status = 'confirmed', updated_at = now()
WHERE status = 'credited';

UPDATE public.crypto_chain_transactions
SET status = 'failed', updated_at = now()
WHERE status = 'ignored';
