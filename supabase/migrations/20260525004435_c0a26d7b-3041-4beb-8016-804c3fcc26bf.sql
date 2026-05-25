
DROP POLICY IF EXISTS "Buyers and owners view stem files" ON public.music_stem_files;

CREATE POLICY "Buyers and owners view stem files"
ON public.music_stem_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.music_stem_listings l
    WHERE l.id = music_stem_files.listing_id
      AND l.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.music_stem_purchases p
    WHERE p.listing_id = music_stem_files.listing_id
      AND p.buyer_id = auth.uid()
  )
);
