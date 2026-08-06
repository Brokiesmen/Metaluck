-- Wallet game reservations (games stakes via ReserveFunds / CreditBalance / CompleteTransaction)
CREATE TABLE IF NOT EXISTS public.wallet_game_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL,
  currency_code text NOT NULL REFERENCES public.currencies (code),
  amount bigint NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'reserved'
    CHECK (status = ANY (ARRAY['reserved'::text, 'captured'::text, 'released'::text, 'settled'::text])),
  game text NOT NULL,
  ref_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_game_reservations_user_status_idx
  ON public.wallet_game_reservations (user_id, status);
CREATE INDEX IF NOT EXISTS wallet_game_reservations_game_ref_idx
  ON public.wallet_game_reservations (game, ref_id);

ALTER TABLE public.wallet_game_reservations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.minerush_games
  ADD COLUMN IF NOT EXISTS reservation_id uuid REFERENCES public.wallet_game_reservations (id);
