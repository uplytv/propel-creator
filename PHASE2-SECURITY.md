# PHASE 2 SECURITY HARDENING — Report

Date: 2026-07-06 · Scope: RLS matrix, reserved usernames, edge-function rate limiting, storage buckets, input validation / XSS.
All changes are additive. Webhooks (`stripe-webhook`, `mux-webhook`), classroom files, `src/components/social/*`, `StreamChat.tsx`, and `Stream/Live/GoLive` pages were not touched, per the coordination directive.

---

## 1. RLS matrix

Method: every table in `src/integrations/supabase/types.ts` (**505 tables**, the live schema) was checked against all 357 files in `supabase/migrations/` for `ENABLE ROW LEVEL SECURITY` and `CREATE POLICY` (whitespace/quote-aware parsing; policy names containing the word "on" handled correctly).

### Summary (before → after)

| State | Before | After |
|---|---|---|
| RLS enabled + ≥1 policy | 502 | **505** |
| **No RLS at all (P0)** | **3** | **0** |
| RLS enabled, zero policies (deny-all) | 0 | 0 |

The full 505-row matrix reduces to the three exceptions below; every other table already had RLS enabled with at least one policy in migrations.

### P0 findings — tables with NO RLS (fixed)

These three tables exist in the live schema but have **no DDL in any migration** (created directly on the live DB, most likely via the Lovable dashboard). With no RLS, they were fully **readable and writable by anyone holding the public anon key** via PostgREST.

| Table | App call sites | Fix (least-privilege) |
|---|---|---|
| `boost_toast_events` | none (telemetry log; only in types.ts) | RLS on; INSERT own rows (authenticated, `user_id = auth.uid()`); SELECT own or `creator_id = auth.uid()`; no update/delete |
| `comment_reports` | none (FK → `short_comments`) | RLS on; INSERT as self (`reporter_id = auth.uid()`); SELECT own reports; moderation via service role only |
| `short_comments` | none (shorts comments; /shorts is post-launch) | RLS on; SELECT non-hidden or own; INSERT as self; UPDATE/DELETE own; moderation columns via service role |

**Migration:** `supabase/migrations/20260706190000_rls_gaps.sql` — every statement is guarded with `to_regclass()` (no-op on databases where the tables don't exist, since no migration creates them) and `pg_policies` existence checks (idempotent).

### Deny-all check

An earlier pass flagged `music_setlist_items` and `smart_link_presaves` as "RLS enabled, zero policies"; both were regex false-positives (policy names containing " on "). Verified:
- `music_setlist_items` — full policy set in `20260510170647` (public read of published setlists, artist-owned writes).
- `smart_link_presaves` — intentionally service-role-only (written by `apple-presave`, `spotify-presave-callback`, `smartlink-release-cron` edge fns). Correct as-is.

### Views (no RLS possible — security_invoker check)

All 7 views in types.ts run with `security_invoker = on` in their latest definition, so underlying-table RLS applies:

| View | security_invoker | Defined/updated in |
|---|---|---|
| `email_ab_test_results` | on | 20260329055834 |
| `event_occupancy` | on | 20260611170000 / 20260615053215 |
| `music_show_tip_leaderboard` | on | 20260510152223 |
| `mux_live_streams_public` | on | 20260321000218 |
| `products_public` | on | 20260321000202 |
| `profiles_public` | on (was flipped to false in 20260316195715, restored 20260321000218) | 20260321000218 |
| `unified_referral_leaderboard` | on | 20260525003957 |

pgmq/system tables: none present in types.ts; skipped by design.

---

## 2. Reserved usernames

**Problem:** the bare `/:username` catch-all is the last route in `App.tsx`. A profile username equal to a real route's first segment (e.g. `dashboard`, `admin`, `auth`) collides with app routes. Username was settable from the client (`CreatorProfileEditDrawer`) and by direct PostgREST update with **no format or reserved-name check anywhere** (the DB has only `UNIQUE`).

**Fixes (client + server):**

- **`src/lib/reservedUsernames.ts` (new)** — builds the reserved set systematically: first segments of every pattern in the route registry (`KNOWN_PATTERNS`, now exported from `src/lib/routeRegistry.ts`) + static additions (App.tsx segments not in the registry: `apply`, `aria`, `arya*`, `blake*`, `blog`, `founders`, `health`, `ppv`, `roster`, `upgrade`, `vs`, …; roster artist vanity slugs `omid/morvarid/andy/bazi/bobby/sonuha` + aliases; infra/impersonation names `api`, `www`, `root`, `support`, `uply`, …). Each multi-word segment is reserved in raw, compact, and underscore spellings (`ads-manager` → `adsmanager`, `ads_manager`). **204 reserved names.** Also exports `USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/` and `validateUsername()`.
- **Client enforcement** — `CreatorProfileEditDrawer.handleSave` now validates via `validateUsername()` before saving (toast on failure); username input gets `maxLength={30}` (charset filter already existed).
- **Server enforcement** — `supabase/migrations/20260706191000_reserved_usernames.sql`: `enforce_username_rules()` (SECURITY DEFINER, `search_path=public`) as a `BEFORE INSERT OR UPDATE OF username` trigger on `public.profiles`. Rejects bad format and reserved names with `check_violation`. It only fires when the username is actually being set/changed (`IS DISTINCT FROM OLD.username`), so legacy rows and unrelated profile updates (onboarding, avatar, account_type) are never blocked, and `handle_new_user` (which inserts `username = NULL`) is unaffected. `profiles` already has RLS; the trigger adds no new read/write surface.

Username-setting surface verified: `CreatorProfileEditDrawer` is the only client write path (`handle_new_user` does not set username; Onboarding only reads it). There is no availability endpoint; the trigger covers direct PostgREST writes.

Keep-in-sync note: when adding a new top-level route, add it to `routeRegistry.ts` (the TS side picks it up automatically) and to the array in the trigger migration.

---

## 3. Rate limiting

Existing mechanisms found and reused **exactly**:
- `auth_rate_limits` + `check_auth_rate_limit` RPC via `auth-rate-check` edge fn (signup/login/password_reset from `src/pages/Auth.tsx`), cleaned nightly by cron `cleanup-auth-rate-limits` (03:00, 24 h retention — `20260325230038`).
- `edge_function_rate_limits` table (key/call_count/window_start) used by `stream-heartbeat`, `start-simulcast`, `validate-rtmp`, `test-simulcast-connection` with key shape `ratelimit:<identifier>:<fnName>`.
- `aria_rate_limits` (20/hr per user) used by `aria-chat`.
- `aria_command_count_last_hour` RPC (30/hr) used by `aria-intent-parser`.

New shared helper: **`supabase/functions/_shared/rateLimit.ts`** — `checkEdgeRateLimit()` reuses the `edge_function_rate_limits` table and key shape verbatim, wrapped in try/catch so it **fails open** on any infra error; `requestIp()` derives the anonymous identifier. All new 429 responses carry clear user-facing messages.

### Coverage table

| Edge function | Auth | Before | After |
|---|---|---|---|
| signup / login / password_reset (`auth-rate-check`) | n/a | ✅ 5/hr, 10/15min, 3/hr | unchanged |
| `create-platform-checkout` | **optional (guest trial path!)** | ❌ none | ✅ user: 20/10 min; **guest: 10/10 min per IP** — checked before any Stripe call |
| `track-affiliate-conversion` | none (verify_jwt=false) | ❌ none | ✅ 30/min per IP |
| `aria-chat` | JWT | ✅ 20/hr (`aria_rate_limits`) | unchanged |
| `aria-assistant` | JWT | ❌ none | ✅ 30/hr per user |
| `aria-intent-parser` | JWT | ✅ 30/hr (RPC) | unchanged |
| `aria-pricing-intelligence` | JWT | ❌ none | ✅ 20/hr per user |
| `aria-fraud-sentinel` | JWT | ❌ none | ✅ 20/hr per user |
| `aria-post-event-report` | JWT | ❌ none | ✅ 20/hr per user |
| `aria-event-copilot` | **none** (verify_jwt=false) | ❌ none — open Anthropic spend | ✅ 10/10 min per IP |
| `aria-attendee-concierge` | **none** (public buyer Q&A) | ❌ none — open Anthropic spend | ✅ 10/10 min per IP |
| `aria-content-repurpose` | **none** (verify_jwt=false, 2800-token budget) | ❌ none — open Anthropic spend | ✅ 10/hr per IP |

Notable: `aria-event-copilot`, `aria-attendee-concierge`, and `aria-content-repurpose` were fully unauthenticated Anthropic-calling endpoints (`verify_jwt = false` in `config.toml`) — unbounded API-credit burn for anyone with the URL. Now IP-limited (P1 cost-abuse closed; consider requiring JWT on copilot/repurpose as follow-up since their UIs are creator-only).

**Cleanup:** `edge_function_rate_limits` had no pruning (and now accrues unbounded IP keys) — added cron `cleanup-edge-function-rate-limits` (daily 03:00, deletes rows untouched for 24 h) in **`supabase/migrations/20260706192000_edge_rate_limit_cleanup.sql`**. Table already has RLS (20260412080954); no policy changes.

---

## 4. Storage buckets

| Bucket | public | SELECT | INSERT | UPDATE/DELETE | Verdict |
|---|---|---|---|---|---|
| `avatars` | true | public | auth, own folder | own folder | ✅ intended (loose update/delete policies replaced in 20260611144352) |
| `covers` | true | public | own folder | own folder | ✅ |
| `product-images` | true | public | own folder | own folder | ✅ |
| `blast-media` | true | public | own folder (hardened 20260612053050) | owner delete | ✅ |
| `newsletter-images` | true | public | own folder (hardened 20260611144352) | — | ✅ |
| `podcast-audio` | true | public | own folder (hardened 20260611144352) | — | ✅ |
| `stories` | true | public | own folder | own delete | ✅ |
| `smart-links` | true | public | own folder | own folder | ✅ |
| `music-art` | true (5 MB, image/* only) | public | own folder | own folder | ✅ |
| `track-previews` | true | public | own folder | own folder | ✅ |
| **`digital-products`** | **false** | owner only (buyers via `get-product-download` edge fn) | owner | owner | ✅ **NOT public — verified** |
| **`track-private`** | **false** | owner only (playback via `get-track-playback`) | owner | owner | ✅ |
| `competition-entries` | (bucket created outside migrations) | public | own folder | own folder | ⚠️ policies fine; bucket row itself isn't in migrations — public read is intended (`getPublicUrl` in `useCompetition.ts`). Recommend snapshotting the bucket DDL into a migration. |

No genuinely wrong bucket configs found → no storage migration needed. The two sensitive buckets (`digital-products`, `track-private`) are private with owner-scoped policies.

---

## 5. Input validation & XSS

### Length caps added

| Surface | Field | Cap | Where enforced |
|---|---|---|---|
| Profile edit drawer | username | 3–30, `[a-z0-9_]` | client (`validateUsername` + `maxLength`) **and** DB trigger |
| Profile edit drawer | display_name | 80 | `maxLength` |
| Profile edit drawer | bio | 500 | `maxLength` |
| Profile edit drawer | creator_type | 60 | `maxLength` |
| Community post | title | 200 | mutation guard (`useCreateCommunityPost`) + `maxLength` in `PostEditor.tsx` and `SpaceCommunityTab.tsx` |
| Community post | body | 10 000 | same |
| Community comment | body | 2 000 | mutation guard (`useCreateComment`) + `maxLength` on comment input |

Caps are exported as `COMMUNITY_POST_TITLE_MAX` / `COMMUNITY_POST_BODY_MAX` / `COMMUNITY_COMMENT_MAX` from `src/hooks/useCreatorSpace.ts` so hooks and composers can't drift. No zod schema existed for these forms, so guards live in the shared mutation hooks (all composers funnel through them). DB CHECK constraints were deliberately not added (per directive; too rigid for existing rows).

### XSS surface (`dangerouslySetInnerHTML` audit)

| File | Content | Verdict |
|---|---|---|
| `src/components/email/EmailPreview.tsx:82` | user-authored email HTML | ✅ safe — body run through DOMPurify, interpolations HTML-escaped, avatar URL protocol-checked, final template DOMPurify'd again |
| `src/components/ui/chart.tsx:70` | generated `<style>` from `ChartConfig` | ✅ safe — developer-supplied theme colors, standard shadcn pattern; not user-reachable |
| `src/components/space/SpaceClassroomTab.tsx:190` | **Quill lesson description rendered RAW** (`__html: value`, no sanitization) | 🚩 **P0 — stored XSS**: a creator can persist `<img onerror=...>`/script-bearing HTML in a lesson description that executes in every member's browser. **NOT fixed here** — file is owned by the in-flight classroom agent per the coordination directive. Required fix (one-liner; `dompurify` is already a dependency): `dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }}`. Flagging for that agent / immediate follow-up. |

---

## P0/P1 recap

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | P0 | `boost_toast_events` — no RLS, anon read/write via PostgREST | ✅ fixed (20260706190000) |
| 2 | P0 | `comment_reports` — no RLS | ✅ fixed (20260706190000) |
| 3 | P0 | `short_comments` — no RLS | ✅ fixed (20260706190000) |
| 4 | P0 | Stored XSS in `SpaceClassroomTab.tsx:190` (unsanitized Quill HTML) | 🚩 flagged — file owned by in-flight classroom agent; one-line DOMPurify fix required |
| 5 | P1 | 3 unauthenticated Anthropic endpoints with zero throttling (credit-burn) | ✅ IP rate-limited; recommend adding JWT to copilot/repurpose as follow-up |
| 6 | P1 | Guest checkout (`create-platform-checkout`) unthrottled Stripe session creation | ✅ IP rate-limited |
| 7 | P1 | Route-shadowing usernames (`admin`, `dashboard`, …) claimable | ✅ client + DB trigger |
| 8 | P2 | `edge_function_rate_limits` never pruned | ✅ daily cron (20260706192000) |
| 9 | P2 | `competition-entries` bucket exists only on live DB, not in migrations | recommend snapshotting DDL |

## Deploy order

1. Apply migrations `20260706190000_rls_gaps.sql`, `20260706191000_reserved_usernames.sql`, `20260706192000_edge_rate_limit_cleanup.sql`.
2. Deploy edge functions: `create-platform-checkout`, `track-affiliate-conversion`, `aria-assistant`, `aria-pricing-intelligence`, `aria-fraud-sentinel`, `aria-post-event-report`, `aria-event-copilot`, `aria-attendee-concierge`, `aria-content-repurpose` (all now import `_shared/rateLimit.ts`).
3. Frontend ships with the same push (reserved-username validation, length caps).
4. Regenerate `types.ts` after migrations if schema tooling flags drift (no new tables/columns were added, so no regen strictly required).
