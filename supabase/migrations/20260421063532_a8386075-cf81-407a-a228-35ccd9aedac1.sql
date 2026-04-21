
-- Global events from external providers (Ticketmaster, Eventbrite)
CREATE TABLE public.events_global (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id text NOT NULL UNIQUE,
  title text NOT NULL,
  date timestamptz,
  venue text,
  city text,
  country text,
  category text,
  image_url text,
  ticket_url text,
  artist_name text,
  source text NOT NULL CHECK (source IN ('ticketmaster','eventbrite')),
  is_persian boolean NOT NULL DEFAULT false,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_global_date ON public.events_global(date);
CREATE INDEX idx_events_global_category ON public.events_global(category);
CREATE INDEX idx_events_global_is_persian ON public.events_global(is_persian);
CREATE INDEX idx_events_global_city ON public.events_global(city);
CREATE INDEX idx_events_global_country ON public.events_global(country);
CREATE INDEX idx_events_global_search ON public.events_global
  USING gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(artist_name,'') || ' ' || coalesce(venue,'') || ' ' || coalesce(city,'')));

ALTER TABLE public.events_global ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Global events are viewable by everyone"
  ON public.events_global FOR SELECT
  USING (true);

-- Creator tags linking streams/videos to global events
CREATE TABLE public.event_creator_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events_global(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  stream_id uuid,
  video_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_tag_target_check CHECK (stream_id IS NOT NULL OR video_id IS NOT NULL)
);

CREATE INDEX idx_event_creator_tags_event ON public.event_creator_tags(event_id);
CREATE INDEX idx_event_creator_tags_creator ON public.event_creator_tags(creator_id);
CREATE INDEX idx_event_creator_tags_stream ON public.event_creator_tags(stream_id);
CREATE INDEX idx_event_creator_tags_video ON public.event_creator_tags(video_id);

ALTER TABLE public.event_creator_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event tags are viewable by everyone"
  ON public.event_creator_tags FOR SELECT
  USING (true);

CREATE POLICY "Creators can tag their own content"
  ON public.event_creator_tags FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can remove their own tags"
  ON public.event_creator_tags FOR DELETE
  USING (auth.uid() = creator_id);
