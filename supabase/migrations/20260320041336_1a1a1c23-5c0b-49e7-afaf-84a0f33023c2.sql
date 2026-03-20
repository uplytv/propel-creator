-- Performance indexes for key query patterns
CREATE INDEX IF NOT EXISTS idx_mux_live_streams_creator_status ON public.mux_live_streams (user_id, status);
CREATE INDEX IF NOT EXISTS idx_community_posts_creator_created ON public.community_posts (creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_created ON public.transactions (wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_subscriptions_member_status ON public.member_subscriptions (member_id, status);
CREATE INDEX IF NOT EXISTS idx_member_subscriptions_creator_status ON public.member_subscriptions (creator_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_videos_creator_public ON public.videos (creator_id, is_public);
CREATE INDEX IF NOT EXISTS idx_clips_creator ON public.clips (creator_id);
CREATE INDEX IF NOT EXISTS idx_events_starts_status ON public.events (starts_at, status);
CREATE INDEX IF NOT EXISTS idx_events_creator ON public.events (creator_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON public.tickets (event_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_buyer ON public.tickets (buyer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_qr_token ON public.tickets (qr_code_token);

-- Add auto_generate_slug trigger on events table if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_event_slug' AND tgrelid = 'public.events'::regclass
  ) THEN
    CREATE TRIGGER set_event_slug
      BEFORE INSERT ON public.events
      FOR EACH ROW
      WHEN (NEW.slug IS NULL)
      EXECUTE FUNCTION public.auto_generate_slug();
  END IF;
END $$;