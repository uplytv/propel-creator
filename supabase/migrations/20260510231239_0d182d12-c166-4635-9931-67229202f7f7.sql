CREATE TABLE IF NOT EXISTS public.music_lyric_snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  title text NOT NULL,
  snippet_text text NOT NULL,
  mood text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','refining','finalized','shelved')),
  suggestion_count integer NOT NULL DEFAULT 0,
  reaction_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mlsnip_artist ON public.music_lyric_snippets(artist_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.music_lyric_snippet_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snippet_id uuid NOT NULL REFERENCES public.music_lyric_snippets(id) ON DELETE CASCADE,
  suggester_id uuid NOT NULL,
  suggested_text text NOT NULL,
  reasoning text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mlsnip_sugg_snippet ON public.music_lyric_snippet_suggestions(snippet_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.music_lyric_snippet_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snippet_id uuid NOT NULL REFERENCES public.music_lyric_snippets(id) ON DELETE CASCADE,
  fan_id uuid NOT NULL,
  reaction text NOT NULL CHECK (reaction IN ('fire','heart','genius','feels')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(snippet_id, fan_id)
);

ALTER TABLE public.music_lyric_snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_lyric_snippet_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_lyric_snippet_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View non-draft snippets" ON public.music_lyric_snippets;
CREATE POLICY "View non-draft snippets" ON public.music_lyric_snippets FOR SELECT USING (status <> 'draft' OR auth.uid() = artist_id);
DROP POLICY IF EXISTS "Artists insert own snippets" ON public.music_lyric_snippets;
CREATE POLICY "Artists insert own snippets" ON public.music_lyric_snippets FOR INSERT WITH CHECK (auth.uid() = artist_id);
DROP POLICY IF EXISTS "Artists update own snippets" ON public.music_lyric_snippets;
CREATE POLICY "Artists update own snippets" ON public.music_lyric_snippets FOR UPDATE USING (auth.uid() = artist_id);
DROP POLICY IF EXISTS "Artists delete own snippets" ON public.music_lyric_snippets;
CREATE POLICY "Artists delete own snippets" ON public.music_lyric_snippets FOR DELETE USING (auth.uid() = artist_id);

DROP POLICY IF EXISTS "View lyric suggestions" ON public.music_lyric_snippet_suggestions;
CREATE POLICY "View lyric suggestions" ON public.music_lyric_snippet_suggestions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Fans submit lyric suggestions" ON public.music_lyric_snippet_suggestions;
CREATE POLICY "Fans submit lyric suggestions" ON public.music_lyric_snippet_suggestions FOR INSERT WITH CHECK (auth.uid() = suggester_id);
DROP POLICY IF EXISTS "Suggester or artist update lyric" ON public.music_lyric_snippet_suggestions;
CREATE POLICY "Suggester or artist update lyric" ON public.music_lyric_snippet_suggestions FOR UPDATE USING (
  auth.uid() = suggester_id OR auth.uid() IN (SELECT artist_id FROM public.music_lyric_snippets WHERE id = snippet_id)
);
DROP POLICY IF EXISTS "Suggester delete own lyric" ON public.music_lyric_snippet_suggestions;
CREATE POLICY "Suggester delete own lyric" ON public.music_lyric_snippet_suggestions FOR DELETE USING (auth.uid() = suggester_id);

DROP POLICY IF EXISTS "View lyric reactions" ON public.music_lyric_snippet_reactions;
CREATE POLICY "View lyric reactions" ON public.music_lyric_snippet_reactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Fans add lyric reactions" ON public.music_lyric_snippet_reactions;
CREATE POLICY "Fans add lyric reactions" ON public.music_lyric_snippet_reactions FOR INSERT WITH CHECK (auth.uid() = fan_id);
DROP POLICY IF EXISTS "Fans update own lyric reactions" ON public.music_lyric_snippet_reactions;
CREATE POLICY "Fans update own lyric reactions" ON public.music_lyric_snippet_reactions FOR UPDATE USING (auth.uid() = fan_id);
DROP POLICY IF EXISTS "Fans delete own lyric reactions" ON public.music_lyric_snippet_reactions;
CREATE POLICY "Fans delete own lyric reactions" ON public.music_lyric_snippet_reactions FOR DELETE USING (auth.uid() = fan_id);

CREATE OR REPLACE FUNCTION public.sync_lyric_snippet_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid;
BEGIN
  sid := COALESCE(NEW.snippet_id, OLD.snippet_id);
  UPDATE public.music_lyric_snippets s SET
    suggestion_count = (SELECT count(*) FROM public.music_lyric_snippet_suggestions WHERE snippet_id = sid),
    reaction_count = (SELECT count(*) FROM public.music_lyric_snippet_reactions WHERE snippet_id = sid),
    updated_at = now()
  WHERE s.id = sid;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_mlsnip_sugg_counts ON public.music_lyric_snippet_suggestions;
CREATE TRIGGER trg_mlsnip_sugg_counts AFTER INSERT OR DELETE OR UPDATE ON public.music_lyric_snippet_suggestions
FOR EACH ROW EXECUTE FUNCTION public.sync_lyric_snippet_counts();
DROP TRIGGER IF EXISTS trg_mlsnip_react_counts ON public.music_lyric_snippet_reactions;
CREATE TRIGGER trg_mlsnip_react_counts AFTER INSERT OR DELETE OR UPDATE ON public.music_lyric_snippet_reactions
FOR EACH ROW EXECUTE FUNCTION public.sync_lyric_snippet_counts();