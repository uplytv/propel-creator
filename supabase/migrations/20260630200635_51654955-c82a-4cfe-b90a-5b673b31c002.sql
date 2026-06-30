CREATE TABLE public.founder_offer_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  offer_key TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_name TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent TEXT,
  status TEXT NOT NULL DEFAULT 'paid',
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.founder_offer_purchases TO authenticated;
GRANT ALL ON public.founder_offer_purchases TO service_role;

ALTER TABLE public.founder_offer_purchases ENABLE ROW LEVEL SECURITY;

-- Authenticated users may read only their own purchase rows.
CREATE POLICY "Users can view their own founder offer purchases"
  ON public.founder_offer_purchases
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- All writes are performed by the service role inside edge functions; no
-- INSERT/UPDATE/DELETE policy is granted to anon or authenticated.

CREATE INDEX idx_founder_offer_purchases_user_id ON public.founder_offer_purchases(user_id);
CREATE INDEX idx_founder_offer_purchases_offer_key ON public.founder_offer_purchases(offer_key);
CREATE INDEX idx_founder_offer_purchases_created_at ON public.founder_offer_purchases(created_at DESC);

CREATE TRIGGER update_founder_offer_purchases_updated_at
  BEFORE UPDATE ON public.founder_offer_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();