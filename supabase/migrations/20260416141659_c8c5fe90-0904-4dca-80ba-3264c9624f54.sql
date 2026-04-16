
-- A/B winner tracking
ALTER TABLE public.email_broadcasts ADD COLUMN IF NOT EXISTS ab_winner_sent boolean DEFAULT false;

-- Drip sequences
CREATE TABLE public.drip_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Welcome Sequence',
  trigger_event text NOT NULL DEFAULT 'new_subscriber',
  trigger_tag text,
  status text NOT NULL DEFAULT 'paused',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.drip_sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.drip_sequences(id) ON DELETE CASCADE,
  step_number integer NOT NULL DEFAULT 1,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  delay_hours integer NOT NULL DEFAULT 24,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.drip_sequence_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.drip_sequences(id) ON DELETE CASCADE,
  subscriber_email text NOT NULL,
  current_step integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  last_step_sent_at timestamptz,
  UNIQUE(sequence_id, subscriber_email)
);

CREATE TABLE public.drip_sequence_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.drip_sequence_enrollments(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.drip_sequence_steps(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent'
);

-- RLS
ALTER TABLE public.drip_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drip_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drip_sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drip_sequence_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators manage own sequences" ON public.drip_sequences FOR ALL USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators manage own steps" ON public.drip_sequence_steps FOR ALL
  USING (EXISTS (SELECT 1 FROM public.drip_sequences ds WHERE ds.id = sequence_id AND ds.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.drip_sequences ds WHERE ds.id = sequence_id AND ds.creator_id = auth.uid()));

CREATE POLICY "Creators manage own enrollments" ON public.drip_sequence_enrollments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.drip_sequences ds WHERE ds.id = sequence_id AND ds.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.drip_sequences ds WHERE ds.id = sequence_id AND ds.creator_id = auth.uid()));

CREATE POLICY "Creators view own sends" ON public.drip_sequence_sends FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.drip_sequence_enrollments e
    JOIN public.drip_sequences ds ON ds.id = e.sequence_id
    WHERE e.id = enrollment_id AND ds.creator_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_drip_sequences_creator ON public.drip_sequences(creator_id);
CREATE INDEX idx_drip_steps_sequence ON public.drip_sequence_steps(sequence_id);
CREATE INDEX idx_drip_enrollments_sequence ON public.drip_sequence_enrollments(sequence_id);
CREATE INDEX idx_drip_enrollments_status ON public.drip_sequence_enrollments(status);

-- Update timestamp trigger
CREATE TRIGGER update_drip_sequences_updated_at BEFORE UPDATE ON public.drip_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
