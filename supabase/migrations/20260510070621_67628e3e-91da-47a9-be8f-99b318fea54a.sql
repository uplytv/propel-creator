
CREATE TABLE IF NOT EXISTS public.track_universal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  platform text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track_id, platform)
);

ALTER TABLE public.track_universal_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read universal links"
  ON public.track_universal_links FOR SELECT USING (true);

CREATE POLICY "Track owner manages universal links"
  ON public.track_universal_links FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND t.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND t.creator_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_universal_links_track ON public.track_universal_links(track_id);

CREATE TABLE IF NOT EXISTS public.group_blends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Group Blend',
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_blend_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blend_id uuid NOT NULL REFERENCES public.group_blends(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blend_id, user_id)
);

ALTER TABLE public.group_blends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_blend_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_blend_member(_blend_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_blend_members WHERE blend_id = _blend_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.group_blends WHERE id = _blend_id AND owner_id = _user_id
  );
$$;

CREATE POLICY "Owner manages blend"
  ON public.group_blends FOR ALL
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Members view blend"
  ON public.group_blends FOR SELECT
  USING (public.is_blend_member(id, auth.uid()));

CREATE POLICY "Owner manages members"
  ON public.group_blend_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.group_blends b WHERE b.id = blend_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.group_blends b WHERE b.id = blend_id AND b.owner_id = auth.uid()));

CREATE POLICY "Members view membership"
  ON public.group_blend_members FOR SELECT
  USING (public.is_blend_member(blend_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_blend_members_blend ON public.group_blend_members(blend_id);
CREATE INDEX IF NOT EXISTS idx_blend_members_user ON public.group_blend_members(user_id);
