
CREATE TABLE IF NOT EXISTS public.artist_blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_slug text NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  tag text,
  read_time text NOT NULL DEFAULT '3 min read',
  published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artist_slug, slug)
);

GRANT SELECT ON public.artist_blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_blog_posts TO authenticated;
GRANT ALL ON public.artist_blog_posts TO service_role;

ALTER TABLE public.artist_blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published artist blog posts"
  ON public.artist_blog_posts FOR SELECT
  USING (published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert artist blog posts"
  ON public.artist_blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update artist blog posts"
  ON public.artist_blog_posts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete artist blog posts"
  ON public.artist_blog_posts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS artist_blog_posts_artist_slug_idx
  ON public.artist_blog_posts (artist_slug, published_at DESC);

CREATE OR REPLACE FUNCTION public.set_artist_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_artist_blog_posts_updated_at ON public.artist_blog_posts;
CREATE TRIGGER trg_artist_blog_posts_updated_at
  BEFORE UPDATE ON public.artist_blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_artist_blog_posts_updated_at();
