CREATE TABLE IF NOT EXISTS public.site_ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_id uuid REFERENCES public.creator_pages(id) ON DELETE SET NULL,
  page_type text,
  prompt text NOT NULL,
  credits_charged integer NOT NULL DEFAULT 0,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  model text,
  preview text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_ai_generations_user_created_idx
  ON public.site_ai_generations (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.site_ai_generations TO authenticated;
GRANT ALL ON public.site_ai_generations TO service_role;
ALTER TABLE public.site_ai_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own AI generations"
  ON public.site_ai_generations FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users insert their own AI generations"
  ON public.site_ai_generations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());