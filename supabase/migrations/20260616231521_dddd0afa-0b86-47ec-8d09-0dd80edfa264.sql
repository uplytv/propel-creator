UPDATE public.feature_registry
SET default_enabled = true
WHERE key IN ('launchpad','repurpose','ai_team_dashboard','growth_tasks');

INSERT INTO public.category_feature_defaults (category_id, feature_key, enabled)
SELECT bc.id, fk.key, true
FROM public.business_categories bc
CROSS JOIN (VALUES ('launchpad'),('repurpose'),('ai_team_dashboard'),('growth_tasks')) AS fk(key)
ON CONFLICT (category_id, feature_key) DO UPDATE SET enabled = true;