# UPLY — Full Platform Audit (Phase 1)

**Date:** 2026-06-11
**Scope:** Read-only audit. No code changed. Covers (1A) Mux/live-streaming integrity, (1B) paid-access gating, (1C) routing, (1D) UI/UX, brand, funnels, performance.
**Method:** Parallel code audits across `src/` (121 pages, 381 components, 108 hooks) and `supabase/` (151 edge functions, 302 migrations). Headline 🔴 findings were independently re-verified against the current migration state (noted ✅ verified).

**Legend:** 🔴 revenue/security critical · 🟡 broken/confusing UX · 🟢 polish · *Server-enforced?* = is the protection in RLS/edge function (yes) or only client-side UI (no).

> **Hard-rule note:** Several findings touch the Stripe/Mux **webhook handlers** and the **95/5 split**. Per CLAUDE.md these are NOT to be modified without explicit approval. Where a fix would require touching them, the finding is **described only** and tagged `[needs approval]`.

---

## 1A — Mux / Live Streaming Integrity

### 🔴 Critical
1. **Recordings are auto-published regardless of stream privacy.** `supabase/functions/mux-webhook/index.ts:187` hardcodes `is_published=true` (and `:151` hardcodes `is_public=true` on `mux_assets`). A private/sensitive live stream's recording becomes publicly discoverable with no creator opt-in. *Server-enforced?* The flag itself is server-set; RLS then exposes it. `[needs approval — webhook]` Fix path: set `is_published=false` (or inherit the stream's `is_public`) and add a creator publish toggle. ✅ verified (`mux_assets` SELECT policy is `USING (is_public = true)`).

### 🟡 Broken / Confusing
2. **Slug stream lookup can resolve another creator's stream.** `src/pages/Stream.tsx:264-275` queries `.eq('slug', slug)` and only adds `.eq('user_id', …)` when the route profile resolves; on a bad/typo'd username the creator filter is dropped and any public stream with a matching slug is returned. *Server-enforced?* no. Fix: hard-404 when the profile doesn't resolve; always require creator scope.
3. **Unhandled Mux events leave "ghost live" UI.** `mux-webhook` handles `video.live_stream.active/idle/disconnected` and `video.asset.ready/errored/deleted`, but NOT `video.live_stream.error` (or a reconnect-failure terminal). If an encoder dies without sending `idle`, the row stays `status='active'` and the UI shows "Live" over dead video. `[needs approval — webhook]` Report-only.

### 🟢 Polish
4. **`mux_assets.is_public` doesn't inherit stream visibility** (`mux-webhook/index.ts:151`) — see #1.

### ✅ Already solid
- `stream_key` is column-REVOKE'd from `anon`/`authenticated` (`migrations/20260611144352…:3`) — not leakable.
- Discovery feed query (`Live.tsx:91-96`) correctly filters `status='active' AND is_public=true`.
- Private live streams: `mux_live_streams` SELECT RLS is `is_public=true OR auth.uid()=user_id` — server-enforced.
- Stripe & Mux webhook **signature verification** are correctly implemented (5-min replay tolerance).

---

## 1B — Paid Access Gating  ⚠️ highest-value section

### 🔴 Critical — Revenue leaks (all ✅ verified against current RLS)
1. **`community_posts` readable by any logged-in user.** `migrations/20260311094826…:17` — `CREATE POLICY "Anyone can view community posts" … FOR SELECT TO authenticated USING (true)`. No later migration overrides it. The paywall (`ContentGate` in `SpaceCommunityTab.tsx:196`) is **UI-only**; a direct `supabase.from('community_posts').select('*').eq('creator_id', X)` returns everything. *Server-enforced?* **no.**
2. **`classroom_lessons` (and modules) readable by any logged-in user.** `migrations/20260311094826…:89` — same `USING (true)`. All lesson titles/bodies/metadata exposed. *Server-enforced?* **no.**
3. **Paid course video is watchable for free.** `mux_assets` SELECT is `USING (is_public = true)` (`migrations/20260309212710…:57`) and the webhook sets every asset `is_public=true`. `SpaceClassroomTab.tsx:74-86` reads `mux_playback_id` straight from the DB and hands it to a **public** Mux player (no signed playback token). Extract the playback id → stream the paid lesson. *Server-enforced?* **no.** This is the single biggest leak.
4. **Gating is render-then-blur.** `SpaceClassroomTab.tsx:269`, `SpaceCommunityTab.tsx:196` render the real content inside `<ContentGate>` which applies a CSS blur/overlay. Disabling the blur in DevTools reveals the content. *Server-enforced?* **no.** (Severity scales with #1–3; even fixed RLS makes this moot, but today it compounds the leak.)

**Fix path (Phase 2, server-side first):** replace `USING (true)` with policies that check an `access_grants`/`member_subscriptions` row for the post/lesson's `creator_id` (preserving genuinely free/preview rows via an `is_free`/`is_public` column); protect paid video via Mux **signed playback URLs** minted in an edge function after an access check; only then simplify the client gate. ⚠️ This is behavior-changing — must distinguish free vs paid content per creator so we don't hide content that's meant to be public.

### 🟡 Broken / Confusing
5. **No chargeback revocation.** `stripe-webhook` handles `charge.refunded`, `customer.subscription.deleted`, `invoice.payment_failed`, but NOT `charge.dispute.created`/`.closed`. A disputing user keeps access for the 30–90 day dispute window. `[needs approval — webhook]` Report-only; fix via a NEW handler/function, not by editing the existing webhook.
6. **Post-payment "locked" flash.** `useAccess.ts:16-56` relies on the webhook + Realtime; between Stripe redirect and webhook write (~1–5s) the user sees a locked state. Fix: optimistic/poll-on-return after checkout success.

### 🟢 Polish
7. **Public cover URLs.** `SpaceAboutTab.tsx:251` uses `getPublicUrl()` for `covers`. Fine for covers; ensure any *paid* downloadable (digital products in `digital-products` bucket) uses `createSignedUrl()` with expiry — verify `download-asset`/`verify-product-purchase`.
8. **Orphaned `access_grants`** when a creator deletes a paid course (cascade leaves grants pointing at nothing). Cleanup/refund consideration.

### ✅ Already solid
- Money-to-access path is coherent: `create-platform-checkout` → `checkout.session.completed` → `access_grants` + `member_subscriptions` rows. Refund and cancel paths DO revoke `access_grants`.
- Double-purchase deduped via `product_purchases (product_id, buyer_id)` unique + `ignoreDuplicates`.

---

## 1C — Routing

### 🔴 Critical
1. **Footer links to non-existent `/privacy` and `/terms`** (`src/components/landing/v2/HomepageFooter.tsx`) → 404 for visitors on the marketing page. Fix: add routes/static pages or point to external URLs.

### 🟡 Broken / Confusing
2. **No `vercel.json` SPA rewrite.** Deep-link refresh on a nested route may 404 in production depending on Vercel's default handling. Add `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`. (Critical to confirm before Phase 3 ticket pages are shared/bookmarked.)
3. **Unvalidated data-driven navigation.** `DiscoverHero.tsx:139` (`navigate('/'+hero.username)`) and `DiscoverStoriesRail.tsx:16` (`navigate(s.link_url)`) trust DB values; malformed values → silent fail/404. Validate against `routeRegistry`.

### ✅ Already solid / important for Phase 3
- **`/:username` catch-all is SAFE.** React Router v6 ranks by specificity, not declaration order. Every top-level single-segment route (`/dashboard`, `/live`, `/search`, …) out-ranks `/:username`. **Phase 3's `/e/:slug` and `/scan/:eventId` are two-segment and will NOT be shadowed** — but I will still verify route order after adding them, per the hard rule.
- `ProtectedRoute`/`AdminRoute` gating is comprehensive and consistent.
- `src/lib/routeRegistry.ts` maintains 173 known patterns with dev-time drift detection — update it when adding Phase 3 routes.

---

## 1D — UI/UX, Brand, Funnels, Performance

### 🔴 Critical
1. **Brand color system is GREEN, not blue→purple.** ✅ verified: `src/index.css:13` `--primary: 145 100% 50%` (lime green), `:51` `--gradient-mid: 155 80% 55%` (green), and `.text-gradient` (`:226`) runs green→green. This contradicts CLAUDE.md (blue→purple `#3D7CFF → #B025FF`, **never green**) — and clashes with the actual blue→purple logo. The entire primary/accent token set is off-brand. Fix: retune `--primary`/`--accent`/`--gradient-*` tokens to the brand gradient; keep green only for success semantics. (Large visual blast radius — do as a focused, reviewed change.)
2. **Pricing hidden on creator profiles.** Price lives in a separate "Pricing" tab; visitors can't see cost before committing (`CreatorProfile.tsx`, `CreatorSpace.tsx`). Total-price-upfront is also a stated competitive promise — surface tiers on the profile hero.

### 🟡 Broken / Confusing
3. **Signup funnel friction:** `Apply.tsx` 5-step wizard has **no back button**; `Onboarding.tsx` is 12+ steps with no visible progress bar; `Auth.tsx:62-67` enforces strict password rules only revealed on submit (no inline validation), no social sign-in. No social proof in either funnel.
4. **Empty states without CTAs** on ~30–40% of list pages (e.g. `Search.tsx`, `Products.tsx`, `CreatorProfile.tsx` `return null`). Good patterns exist (`Shop.tsx`, `Inbox.tsx`) to copy.
5. **Vague error UX** (~50% of async handlers): e.g. `Analytics.tsx:74` `catch { toast.error("Analysis failed") }` — no actionable detail, nothing to Sentry.
6. **Silent video recovery.** `MuxPlayer.tsx:78` retries live forever with no user-facing "reconnecting" indication.

### 🟢 Polish
7. Routes lazy-loaded ✅; HLS tuned for low-latency live ✅. Remaining `<img>` without `loading="lazy"` were largely fixed in the pre-Phase-1 a11y pass; a few hero images (`CreatorHero`, `DiscoverHero`) remain.

---

## Proposed Phase 2 order (for your approval — not yet executed)

1. **🔴 Close the revenue leaks (server-side):** RLS on `community_posts`/`classroom_lessons`/modules keyed to `access_grants`; Mux **signed playback** for paid video; then tighten the client gate. *(Behavior-changing — needs your sign-off on free-vs-paid rules; I'll show diffs.)*
2. **🔴 Brand tokens** → blue→purple, in one reviewed pass.
3. **🔴 Routing 404s:** add `/privacy`, `/terms`, and `vercel.json` SPA rewrite.
4. **🟡 Chargeback handling & post-pay flash** — via NEW edge function (no webhook edits) `[needs approval]`.
5. **🟡 Funnel + states polish:** back button in Apply, onboarding progress, inline password validation, branded empty/error states.
6. **Streaming robustness** (ghost-live handling) — `[needs approval — webhook]`, design a non-webhook reconciliation if you prefer.

> Items touching the Stripe/Mux webhooks or the 95/5 split are flagged `[needs approval]` and will NOT be changed without your explicit go-ahead, per CLAUDE.md.

**STATUS: Phase 1 complete. Awaiting approval to begin Phase 2.**
