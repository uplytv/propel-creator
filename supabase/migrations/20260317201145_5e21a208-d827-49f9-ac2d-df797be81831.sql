
CREATE OR REPLACE FUNCTION public.increment_product_sales(p_id uuid, p_amount numeric DEFAULT 0)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE products
  SET sales = sales + 1,
      revenue = revenue + p_amount,
      updated_at = now()
  WHERE id = p_id;
END;
$$;
