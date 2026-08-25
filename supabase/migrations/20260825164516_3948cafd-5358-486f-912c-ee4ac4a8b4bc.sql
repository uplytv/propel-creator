CREATE TABLE IF NOT EXISTS public.partner_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner text NOT NULL DEFAULT 'nexaflow',
  name text NOT NULL,
  business text,
  email text NOT NULL,
  phone text,
  monthly_revenue text,
  tier text,
  billing_period text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.partner_leads TO anon;
GRANT INSERT, SELECT ON public.partner_leads TO authenticated;
GRANT ALL ON public.partner_leads TO service_role;

ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_leads_insert_public" ON public.partner_leads;
CREATE POLICY "partner_leads_insert_public"
  ON public.partner_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "partner_leads_select_admin" ON public.partner_leads;
CREATE POLICY "partner_leads_select_admin"
  ON public.partner_leads FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));