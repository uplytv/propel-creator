
CREATE TABLE public.music_collab_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  bpm INTEGER NOT NULL DEFAULT 120,
  music_key TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  cover_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_collab_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.music_collab_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE TABLE public.music_collab_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.music_collab_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  audio_url TEXT,
  volume NUMERIC NOT NULL DEFAULT 1.0,
  pan NUMERIC NOT NULL DEFAULT 0.0,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  locked_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_collab_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.music_collab_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_collab_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_collab_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_collab_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_collab_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_collab_member(_project UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.music_collab_members m
    WHERE m.project_id = _project AND m.user_id = _user
  ) OR EXISTS (
    SELECT 1 FROM public.music_collab_projects p
    WHERE p.id = _project AND p.owner_id = _user
  );
$$;

CREATE POLICY "Project visible to members or public"
  ON public.music_collab_projects FOR SELECT
  USING (is_public = true OR auth.uid() = owner_id OR public.is_collab_member(id, auth.uid()));

CREATE POLICY "Owners insert projects"
  ON public.music_collab_projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners update projects"
  ON public.music_collab_projects FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners delete projects"
  ON public.music_collab_projects FOR DELETE
  USING (auth.uid() = owner_id);

CREATE POLICY "Members visible to members"
  ON public.music_collab_members FOR SELECT
  USING (public.is_collab_member(project_id, auth.uid()));

CREATE POLICY "Owner manages membership"
  ON public.music_collab_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.music_collab_projects p WHERE p.id = music_collab_members.project_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.music_collab_projects p WHERE p.id = music_collab_members.project_id AND p.owner_id = auth.uid()));

CREATE POLICY "Tracks visible to members"
  ON public.music_collab_tracks FOR SELECT
  USING (public.is_collab_member(project_id, auth.uid()) OR EXISTS (SELECT 1 FROM public.music_collab_projects p WHERE p.id = project_id AND p.is_public = true));

CREATE POLICY "Members manage tracks"
  ON public.music_collab_tracks FOR ALL
  USING (public.is_collab_member(project_id, auth.uid()))
  WITH CHECK (public.is_collab_member(project_id, auth.uid()));

CREATE POLICY "Events visible to members"
  ON public.music_collab_events FOR SELECT
  USING (public.is_collab_member(project_id, auth.uid()));

CREATE POLICY "Members write events"
  ON public.music_collab_events FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_collab_member(project_id, auth.uid()));

CREATE INDEX idx_collab_members_project ON public.music_collab_members(project_id);
CREATE INDEX idx_collab_members_user ON public.music_collab_members(user_id);
CREATE INDEX idx_collab_tracks_project ON public.music_collab_tracks(project_id, position);
CREATE INDEX idx_collab_events_project ON public.music_collab_events(project_id, created_at DESC);

CREATE TRIGGER update_collab_projects_updated_at
  BEFORE UPDATE ON public.music_collab_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collab_tracks_updated_at
  BEFORE UPDATE ON public.music_collab_tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.music_collab_tracks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.music_collab_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.music_collab_members;
