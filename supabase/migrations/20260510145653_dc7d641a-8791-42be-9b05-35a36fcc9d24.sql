ALTER TABLE public.music_playlist_collaborators
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor','viewer')),
  ADD COLUMN IF NOT EXISTS invited_by UUID;

ALTER TABLE public.music_playlist_collaborators ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_mpc_user ON public.music_playlist_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_mpc_playlist ON public.music_playlist_collaborators(playlist_id);

CREATE TABLE IF NOT EXISTS public.music_playlist_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor','viewer')),
  created_by UUID NOT NULL,
  expires_at TIMESTAMPTZ,
  consumed_by UUID,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_playlist_invites ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_mpi_playlist ON public.music_playlist_invites(playlist_id);

CREATE OR REPLACE FUNCTION public.is_playlist_collaborator(_playlist_id UUID, _user_id UUID, _min_role TEXT DEFAULT 'viewer')
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.music_playlist_collaborators c
    WHERE c.playlist_id = _playlist_id AND c.user_id = _user_id
      AND (_min_role = 'viewer' OR c.role = 'editor')
  );
$$;

DO $$ BEGIN
  CREATE POLICY "mpc_select_visible" ON public.music_playlist_collaborators FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.creator_id = auth.uid())
    OR public.is_playlist_collaborator(playlist_id, auth.uid(), 'viewer')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "mpc_owner_insert" ON public.music_playlist_collaborators FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.creator_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "mpc_owner_update" ON public.music_playlist_collaborators FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.creator_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "mpc_owner_or_self_delete" ON public.music_playlist_collaborators FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.creator_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "mpi_owner_select" ON public.music_playlist_invites FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.creator_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "mpi_owner_insert" ON public.music_playlist_invites FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.creator_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "mpi_owner_delete" ON public.music_playlist_invites FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.creator_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.accept_playlist_invite(_token TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.music_playlist_invites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO inv FROM public.music_playlist_invites WHERE token = _token;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'Invalid invite'; END IF;
  IF inv.consumed_at IS NOT NULL THEN RAISE EXCEPTION 'Invite already used'; END IF;
  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN RAISE EXCEPTION 'Invite expired'; END IF;

  INSERT INTO public.music_playlist_collaborators (playlist_id, user_id, role, invited_by)
  VALUES (inv.playlist_id, auth.uid(), inv.role, inv.created_by)
  ON CONFLICT (playlist_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.music_playlist_invites SET consumed_by = auth.uid(), consumed_at = now() WHERE id = inv.id;
  RETURN inv.playlist_id;
END;
$$;