ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS featured_product_id uuid REFERENCES public.products(id);
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS featured_product_price numeric;