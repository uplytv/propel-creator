CREATE TABLE IF NOT EXISTS public.creator_platform_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  platform_id text NOT NULL,
  handle text,
  connected_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(creator_id, platform_id)
);
ALTER TABLE public.creator_platform_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators manage own connections" ON public.creator_platform_connections
  FOR ALL TO authenticated USING (creator_id = auth.uid());