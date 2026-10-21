// Explicit, secret-free column lists for tables whose secret columns are not
// readable by client roles (migration 20261021120000_protect_secret_columns).
// select("*") fails on these tables — use these constants instead.

export const MUX_LIVE_STREAM_COLUMNS =
  "id, user_id, mux_stream_id, mux_playback_id, status, title, description, category, is_public, viewer_count, started_at, ended_at, created_at, updated_at, stream_type, featured_product_id, energy_score, slug, channel_category, featured_product_source, hype_train_level, hype_train_expires_at, event_id, is_event_stream, venue_attendance_count, tickets_sold_during_stream, orientation, slow_mode_seconds, is_ppv, ppv_price, is_primetime, scheduled_at, series_name, episode_number";

export const AD_INTEGRATION_COLUMNS =
  "id, user_id, platform, pixel_id, is_active, created_at, updated_at, test_event_code, has_access_token";

export const API_KEY_COLUMNS =
  "id, user_id, name, key_prefix, is_active, last_used_at, requests_today, requests_total, created_at, expires_at";

export const CREATOR_PLATFORM_OAUTH_COLUMNS =
  "id, creator_id, platform, token_expires_at, platform_user_id, platform_username, platform_channel_name, scopes, is_active, connected_at, last_used_at";

export const CREATOR_SHOPIFY_STORE_COLUMNS =
  "id, creator_id, shop_domain, shop_name, currency, is_active, synced_at, created_at";
