CREATE OR REPLACE VIEW public.products_public AS
SELECT id, user_id, name, description, price, type, image_url, sales, created_at
FROM public.products
WHERE status = 'active';