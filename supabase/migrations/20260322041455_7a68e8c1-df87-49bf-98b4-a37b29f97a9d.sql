
-- Add status column to product_purchases
ALTER TABLE public.product_purchases ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed';

-- Add unique constraint on product_purchases (product_id, buyer_id)
ALTER TABLE public.product_purchases ADD CONSTRAINT unique_product_purchase UNIQUE (product_id, buyer_id);

-- Add unique constraint on member_subscriptions (member_id, creator_id)
ALTER TABLE public.member_subscriptions ADD CONSTRAINT unique_member_subscription UNIQUE (member_id, creator_id);
