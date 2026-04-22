
-- Sprint 3: TikTok Shop layer + Unified Social inbox

-- 1) Pin products on clips and shorts (videos already has this column)
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS featured_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.shorts ADD COLUMN IF NOT EXISTS featured_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_clips_featured_product ON public.clips(featured_product_id) WHERE featured_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shorts_featured_product ON public.shorts(featured_product_id) WHERE featured_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_videos_featured_product ON public.videos(featured_product_id) WHERE featured_product_id IS NOT NULL;

-- 2) Persistent shopping cart
CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  source_content_type text,
  source_content_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON public.cart_items(user_id);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own cart" ON public.cart_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add to own cart" ON public.cart_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own cart" ON public.cart_items FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own cart" ON public.cart_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) @mentions across posts, comments, dms
CREATE TABLE IF NOT EXISTS public.mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentioned_user_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  preview text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mentions_user ON public.mentions(mentioned_user_id, read, created_at DESC);

ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own mentions" ON public.mentions FOR SELECT TO authenticated USING (auth.uid() = mentioned_user_id);
CREATE POLICY "Users mark own mentions read" ON public.mentions FOR UPDATE TO authenticated USING (auth.uid() = mentioned_user_id);
CREATE POLICY "Authenticated can create mentions" ON public.mentions FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);
CREATE POLICY "Service role full access mentions" ON public.mentions TO service_role USING (true) WITH CHECK (true);

-- 4) Tag DMs that originated as story replies (for inbox grouping)
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS reply_to_story_id uuid;
CREATE INDEX IF NOT EXISTS idx_direct_messages_story_reply ON public.direct_messages(reply_to_story_id) WHERE reply_to_story_id IS NOT NULL;
