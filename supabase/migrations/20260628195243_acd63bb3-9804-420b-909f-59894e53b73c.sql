
-- ── Tables ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.public_tour_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_slug text NOT NULL,
  city text NOT NULL,
  country text NOT NULL DEFAULT '',
  vote_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_public_tour_requests_slug_city
  ON public.public_tour_requests (artist_slug, lower(city), lower(country));

CREATE INDEX IF NOT EXISTS idx_public_tour_requests_slug_votes
  ON public.public_tour_requests (artist_slug, vote_count DESC);

CREATE TABLE IF NOT EXISTS public.public_tour_request_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.public_tour_requests(id) ON DELETE CASCADE,
  voter_fp text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, voter_fp)
);

GRANT SELECT ON public.public_tour_requests TO anon, authenticated;
GRANT ALL ON public.public_tour_requests TO service_role;
GRANT ALL ON public.public_tour_request_votes TO service_role;

ALTER TABLE public.public_tour_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_tour_request_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tour requests"
  ON public.public_tour_requests
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can update tour requests"
  ON public.public_tour_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read votes"
  ON public.public_tour_request_votes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ── RPCs ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_public_tour_request(
  _artist_slug text,
  _city text,
  _country text,
  _voter_fp text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_city text := btrim(_city);
  v_country text := coalesce(btrim(_country), '');
  v_slug text := btrim(_artist_slug);
  v_fp text := btrim(_voter_fp);
BEGIN
  IF v_slug = '' OR v_city = '' OR v_fp = '' THEN
    RAISE EXCEPTION 'missing required fields';
  END IF;
  IF char_length(v_city) > 80 OR char_length(v_country) > 80 OR char_length(v_slug) > 80 OR char_length(v_fp) > 120 THEN
    RAISE EXCEPTION 'input too long';
  END IF;

  INSERT INTO public.public_tour_requests (artist_slug, city, country, vote_count)
  VALUES (v_slug, v_city, v_country, 0)
  ON CONFLICT (artist_slug, lower(city), lower(country))
  DO UPDATE SET updated_at = now()
  RETURNING id INTO v_id;

  -- Cast the first vote (idempotent)
  INSERT INTO public.public_tour_request_votes (request_id, voter_fp)
  VALUES (v_id, v_fp)
  ON CONFLICT (request_id, voter_fp) DO NOTHING;

  UPDATE public.public_tour_requests
     SET vote_count = (SELECT count(*) FROM public.public_tour_request_votes WHERE request_id = v_id),
         updated_at = now()
   WHERE id = v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.vote_public_tour_request(
  _request_id uuid,
  _voter_fp text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_fp text := btrim(_voter_fp);
BEGIN
  IF v_fp = '' OR char_length(v_fp) > 120 THEN
    RAISE EXCEPTION 'invalid voter';
  END IF;

  INSERT INTO public.public_tour_request_votes (request_id, voter_fp)
  VALUES (_request_id, v_fp)
  ON CONFLICT (request_id, voter_fp) DO NOTHING;

  UPDATE public.public_tour_requests
     SET vote_count = (SELECT count(*) FROM public.public_tour_request_votes WHERE request_id = _request_id),
         updated_at = now()
   WHERE id = _request_id
  RETURNING vote_count INTO v_count;

  RETURN coalesce(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_tour_request(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vote_public_tour_request(uuid, text) TO anon, authenticated;
