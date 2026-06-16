UPDATE public.feature_registry SET default_enabled = true WHERE key = 'smart_links';

INSERT INTO public.category_feature_defaults (category_id, feature_key, enabled)
SELECT bc.id, 'smart_links', true
FROM public.business_categories bc
ON CONFLICT (category_id, feature_key) DO UPDATE SET enabled = true;