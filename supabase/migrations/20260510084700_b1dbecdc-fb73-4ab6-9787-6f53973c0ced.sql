
CREATE TABLE public.music_rights_holders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  payee_user_id UUID,
  payee_name TEXT,
  payee_email TEXT,
  role TEXT NOT NULL DEFAULT 'collaborator',
  share_percent NUMERIC NOT NULL CHECK (share_percent >= 0 AND share_percent <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_royalty_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  source TEXT NOT NULL,
  source_ref TEXT,
  gross_cents INTEGER NOT NULL DEFAULT 0,
  fee_cents INTEGER NOT NULL DEFAULT 0,
  net_cents INTEGER NOT NULL DEFAULT 0,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  distributed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_royalty_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.music_royalty_events(id) ON DELETE CASCADE,
  holder_id UUID NOT NULL REFERENCES public.music_rights_holders(id) ON DELETE CASCADE,
  payee_user_id UUID,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_transfer_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_music_rights_holders_track ON public.music_rights_holders(track_id);
CREATE INDEX idx_music_rights_holders_payee ON public.music_rights_holders(payee_user_id);
CREATE INDEX idx_music_royalty_events_track ON public.music_royalty_events(track_id, occurred_at DESC);
CREATE INDEX idx_music_royalty_payouts_payee ON public.music_royalty_payouts(payee_user_id, status);

ALTER TABLE public.music_rights_holders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_royalty_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_royalty_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and payees view rights"
  ON public.music_rights_holders FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() = payee_user_id);

CREATE POLICY "Owners manage rights"
  ON public.music_rights_holders FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners view royalty events"
  ON public.music_royalty_events FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owners insert royalty events"
  ON public.music_royalty_events FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and payees view payouts"
  ON public.music_royalty_payouts FOR SELECT
  USING (
    auth.uid() = payee_user_id
    OR EXISTS (SELECT 1 FROM public.music_royalty_events e WHERE e.id = event_id AND e.owner_id = auth.uid())
  );

CREATE TRIGGER update_music_rights_holders_updated_at
  BEFORE UPDATE ON public.music_rights_holders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_track_share_total()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _total NUMERIC;
  _track UUID := COALESCE(NEW.track_id, OLD.track_id);
BEGIN
  SELECT COALESCE(SUM(share_percent), 0) INTO _total
    FROM public.music_rights_holders
    WHERE track_id = _track AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  IF TG_OP <> 'DELETE' THEN _total := _total + NEW.share_percent; END IF;
  IF _total > 100 THEN
    RAISE EXCEPTION 'Total share for track exceeds 100 percent (would be %)', _total;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_validate_track_share_total
  BEFORE INSERT OR UPDATE ON public.music_rights_holders
  FOR EACH ROW EXECUTE FUNCTION public.validate_track_share_total();

CREATE OR REPLACE FUNCTION public.distribute_royalty_event(_event_id UUID)
RETURNS SETOF public.music_royalty_payouts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _event public.music_royalty_events;
  _holder public.music_rights_holders;
  _payout public.music_royalty_payouts;
  _amount INTEGER;
BEGIN
  SELECT * INTO _event FROM public.music_royalty_events WHERE id = _event_id FOR UPDATE;
  IF _event IS NULL THEN RAISE EXCEPTION 'Event not found'; END IF;
  IF _event.owner_id <> auth.uid() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _event.distributed_at IS NOT NULL THEN RAISE EXCEPTION 'Already distributed'; END IF;

  FOR _holder IN
    SELECT * FROM public.music_rights_holders WHERE track_id = _event.track_id
  LOOP
    _amount := ROUND(_event.net_cents * _holder.share_percent / 100.0)::INTEGER;
    IF _amount > 0 THEN
      INSERT INTO public.music_royalty_payouts (event_id, holder_id, payee_user_id, amount_cents)
      VALUES (_event.id, _holder.id, _holder.payee_user_id, _amount)
      RETURNING * INTO _payout;
      RETURN NEXT _payout;
    END IF;
  END LOOP;

  UPDATE public.music_royalty_events SET distributed_at = now() WHERE id = _event.id;
  RETURN;
END;
$$;
