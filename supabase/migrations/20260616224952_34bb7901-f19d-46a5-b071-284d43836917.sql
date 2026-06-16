
INSERT INTO public.feature_registry (key, label, core, tier, default_enabled, position) VALUES
  ('events_hub',         'Events Hub',             'live',  'core',     true,  0),
  ('tickets_wallet',     'Ticket Wallet',          'live',  'core',     true,  1),
  ('tickets_scanner',    'Ticket Scanner',         'live',  'embedded', true,  2),
  ('podcast',            'Podcast Hosting',        'live',  'advanced', false, 28),
  ('content_syndication','Content Syndication',    'live',  'advanced', false, 29),
  ('music_suite',        'Music Suite',            'live',  'core',     false, 50),
  ('music_distribution', 'Music Distribution',     'live',  'advanced', false, 51),
  ('smart_links',        'Smart Links',            'earn',  'advanced', false, 60),
  ('radiate',            'Radiate (Geo Broadcast)','earn',  'advanced', false, 61),
  ('brand_deals',        'Brand Deals',            'earn',  'advanced', false, 62),
  ('newsletter',         'Newsletter',             'earn',  'advanced', false, 70),
  ('email_subscribers',  'Email Subscribers',      'earn',  'advanced', false, 71),
  ('email_broadcast',    'Email Broadcast',        'earn',  'advanced', false, 72),
  ('drip_sequences',     'Drip Sequences',         'earn',  'advanced', false, 73),
  ('email_analytics',    'Email Analytics',        'earn',  'advanced', false, 74),
  ('repurpose',          'AI Repurpose',           'aria',  'advanced', false, 80),
  ('launchpad',          'Launchpad',              'aria',  'advanced', false, 81),
  ('ai_team_dashboard',  'AI Team Dashboard',      'aria',  'advanced', false, 82),
  ('developer_api',      'Developer API',          'aria',  'advanced', false, 90)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.category_feature_defaults (category_id, feature_key, enabled)
SELECT bc.id, fk.key, true
FROM public.business_categories bc
CROSS JOIN (VALUES
  ('music_suite'),('music_distribution'),('smart_links'),('radiate'),
  ('newsletter'),('email_subscribers'),('email_broadcast'),('drip_sequences'),('email_analytics'),
  ('brand_deals'),('repurpose'),('launchpad'),('ai_team_dashboard')
) AS fk(key)
WHERE bc.slug = 'music'
ON CONFLICT (category_id, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled;

INSERT INTO public.category_feature_defaults (category_id, feature_key, enabled)
SELECT bc.id, fk.key, true
FROM public.business_categories bc
CROSS JOIN (VALUES
  ('podcast'),('content_syndication'),
  ('newsletter'),('email_subscribers'),('email_broadcast'),('drip_sequences'),('email_analytics')
) AS fk(key)
WHERE bc.slug = 'podcasting'
ON CONFLICT (category_id, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled;

INSERT INTO public.category_feature_defaults (category_id, feature_key, enabled)
SELECT bc.id, fk.key, false
FROM public.business_categories bc
CROSS JOIN (VALUES
  ('music_suite'),('music_distribution'),('smart_links'),('radiate'),
  ('podcast'),('content_syndication'),
  ('newsletter'),('email_subscribers'),('email_broadcast'),('drip_sequences'),('email_analytics'),
  ('brand_deals'),('repurpose'),('launchpad'),('ai_team_dashboard'),('developer_api')
) AS fk(key)
WHERE bc.slug NOT IN ('music','podcasting')
ON CONFLICT (category_id, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled;

INSERT INTO public.category_feature_defaults (category_id, feature_key, enabled)
SELECT bc.id, fk.key, true
FROM public.business_categories bc
CROSS JOIN (VALUES ('events_hub'),('tickets_wallet'),('tickets_scanner')) AS fk(key)
ON CONFLICT (category_id, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled;
