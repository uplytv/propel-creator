CREATE TABLE public.discover_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  cta_label TEXT DEFAULT 'View',
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.discover_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active stories visible to everyone" ON public.discover_stories FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY "Admins manage stories" ON public.discover_stories FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_discover_stories_updated BEFORE UPDATE ON public.discover_stories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_discover_stories_active ON public.discover_stories(is_active, position);

CREATE TABLE public.events_external (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'ticketmaster',
  external_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  city TEXT,
  country TEXT,
  venue_name TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  category TEXT,
  affiliate_url TEXT NOT NULL,
  min_price NUMERIC,
  max_price NUMERIC,
  currency TEXT DEFAULT 'USD',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  click_count INTEGER NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source, external_id)
);
ALTER TABLE public.events_external ENABLE ROW LEVEL SECURITY;
CREATE POLICY "External events visible to everyone" ON public.events_external FOR SELECT USING (true);
CREATE POLICY "Admins manage external events" ON public.events_external FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_events_external_updated BEFORE UPDATE ON public.events_external
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_events_external_featured ON public.events_external(is_featured, start_date);
CREATE INDEX idx_events_external_date ON public.events_external(start_date);

CREATE TABLE public.events_external_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_external_id UUID NOT NULL REFERENCES public.events_external(id) ON DELETE CASCADE,
  user_id UUID,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events_external_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log clicks" ON public.events_external_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read clicks" ON public.events_external_clicks FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));