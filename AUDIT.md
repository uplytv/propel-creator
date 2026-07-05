# UPLY — Full Platform Audit (Phase 0)

**Date:** 2026-07-05 · **Method:** read-only. 5 parallel audit passes (routes/bundle + components/design + state/errors + security/RLS + perf/UX) over `src/` (148 pages, 429 components, 108 hooks) and `supabase/` (171 edge functions, 340 migrations). Headline findings independently re-verified.

**Supersedes** the 2026-06-11 audit. Still-open findings from it are carried forward in §7.

**Legend:** 🔴 revenue/security critical · 🟡 broken/confusing · 🟢 polish. *Server-enforced?* = protection is in RLS/edge (yes) or only client UI (no).

> **Hard-rule note:** Findings touching Stripe/Mux **webhook handlers** or the **95/5 split** are **described only**, tagged `[needs approval]`, per CLAUDE.md.

---

## 🚨 CRITICAL — reported out-of-band, awaiting approval to fix

### C-1 🔴 Unauthenticated affiliate cash-out chain (anonymous → real money out) — VERIFIED
Two `verify_jwt=false` functions with **zero auth checks** (grep-confirmed: 0 `getUser`/signature/Authorization references in either):

1. `supabase/functions/track-affiliate-conversion/index.ts:19-113` — accepts a client-supplied `amount`, computes `commission = amount * 0.2` (`:79`), inserts `affiliate_conversions` with `status:"approved"` (`:89`), then credits `wallets.available_balance` + `lifetime_earned` (`:104`) and writes a `transactions` row.
2. `supabase/functions/stripe-pay-affiliate/index.ts:22-77` — takes any `conversion_id`, and if `status !== "paid"` calls real `stripe.transfers.create` (`:63`) to the connected account, then sets `status:"paid"`.

**Exploit:** an anonymous caller curls #1 with an arbitrary `amount` and a wallet they control → mints an approved commission → curls #2 with the returned `conversion_id` → pulls real funds via Stripe transfer. The only guard is a self-referral equality check. Both are internet-reachable (`verify_jwt=false`, wildcard CORS).

**Fix (proposed — needs approval, touches money):**
- Derive `amount`/commission **server-side** from a Stripe-verified order/payment, never the request body.
- Require a trusted caller: invoke from the **Stripe webhook** on `checkout.session.completed` `[needs approval — webhook]`, OR gate both functions behind service-role/authenticated + server-verified state.
- `stripe-pay-affiliate` must re-verify the conversion was created by a trusted path and matches a real paid order before transferring.

**Recommendation:** fix before anything else. I did not touch it — money code + "don't guess on money" rule. Say the word and I'll implement + show the diff before applying.

---

## 0. Routes (clean ✅)
- **224 routes**, zero duplicate paths. `/:username` → `*` correctly **last**. `/events/*` static-before-param ordering correct (`/events/create`, `/events/global/:eventId` before `/events/:slug`).
- Eager route parent: `SocialLayout` (`App.tsx:235`) is the only non-lazy route component (215 pages are `lazy()`).

## 1. Security & RLS (Agent C)
**Strong foundation, one critical hole (C-1) + a few real gaps.**

### Positives (keep)
- **100% RLS-enable coverage** — all 502 public tables have `ENABLE ROW LEVEL SECURITY`; zero missing. Verified both directions.
- **Disciplined column-level `REVOKE`** on every secret/token/PII: `mux_live_streams.stream_key`, OAuth/DSP `access_token`/`refresh_token`, `api_webhooks.secret`, split-sheet emails, etc.
- **No service-role/Stripe-secret leakage into `src/`** (0 hits for `SUPABASE_SERVICE_ROLE_KEY`; `sk_live`/`whsec` hits are the platform's own dev-API generator, hash-stored).
- **XSS clean** — only 2 `dangerouslySetInnerHTML`: email preview (double-DOMPurify, exemplary) and shadcn chart (own theme CSS). No production `innerHTML` sinks.
- Community/classroom `USING(true)` leaks already fixed by `20260611160000` (`has_creator_access()`, SECURITY DEFINER, pinned search_path); not reintroduced.

### 🔴/🟡 Findings
- **C-1** (above).
- 🟡 **72/171 edge functions run `verify_jwt=false`.** Most compensate with their own `getUser`/signature checks (verified: all Stripe checkout/connect/refund fns, purchase-ticket, scan-ticket, aria-fraud/pricing/post-event do their own auth). But it makes every future function insecure-by-default.
- 🟡 **`stream-heartbeat` trusts body-supplied `user_id`** (`:38`) — no JWT; rate-limit/session keyed off client identity. Impact bounded to simulcast state.
- 🟡 **Unauthenticated ARIA endpoints** `aria-event-copilot`, `aria-attendee-concierge` — no auth, call Claude per request → uncapped anonymous Anthropic spend; concierge returns full published-event data via service role.
- 🟢 **Residual public reads** on tip amounts (`music_show_tips`, `music_tip_jar_*`) and `artist_messages` ("messages public read") — confirm none are private DMs / sensitive financials.

## 2. State management & error handling (Agent B)
- 🟡 **136 silent DB writes** — supabase-js v2 doesn't throw; unchecked results fail invisibly. Worst: `useCreatorSpace.ts` (9 — likes/comments/points counters can desync), `useLiveShop.ts` (7), `Onboarding.tsx` (6), `WaitlistPage.tsx:84` (referral attribution lost).
- 🟡 **`profiles` fetched under 17+ distinct queryKeys across 120 files** — no shared `useProfile()`; cache never dedupes. 463 distinct queryKey bases repo-wide.
- 🟡 **85 of 160 writing files have no `invalidateQueries`** — incl. money-adjacent `useCart.ts` (5 writes).
- 🟡 **N+1 in lists (confirmed):** `events/EventDiscoveryGrid.tsx` EventCard runs a profile query per card; `social/EventHypeMeter` one attendance query per card; `SharedPlanCard` 2/card.
- 🟡 **79 edge functions return raw `error.message`** to clients (info-leak) — incl. 12 sampled Stripe/ticket fns (`stripe-create-checkout:176`, `purchase-ticket:142`, `finalize-ticket-order:206`…). Webhooks excluded per CLAUDE.md.
- ✅ **Money-path UI surfaces errors** — no silent checkout/subscription/ticket failures in the client (toasts present).
- Live-streaming data layer (`useStreamData`/`useLiveShop`/`useStreamEngagement`) is the triple-offender: raw fetch + no invalidation + silent writes, on the launch-critical path.

## 3. Performance & UX states (Agent D)
- 🔴 **1.7 MB eager main chunk** (`index-CZ7lPXQ1.js`) — `PersistentPlayer` (audio) is eagerly imported in `App.tsx:21`, pulling **hls.js into the index chunk**; framer-motion also static in App.tsx. Most sessions never play HLS. **Fix without `manualChunks`** (banned — black-screen incident + CI guard): lazy-load `PersistentPlayer`, make players `await import('hls.js')`.
- 🔴 **SW precaches all 16 MB / 491 chunks on first visit** — negates lazy-loading for new users. Fix: `globIgnores`/`maximumFileSizeToCacheInBytes` in vite-plugin-pwa.
- 🔴 **`public/favicon.png` and `public/logo.png` are 1.4 MB each** (should be <50 K) — also precached.
- 🟡 **0 of 14 audited screens has a strict fetch-error state** — hooks swallow `.error` or throw into consumers that ignore `isError`, so a Supabase outage renders as "No results" / "Stream not found" (`useSearch`, `useNotifications`, `Stream.tsx:252-658`, `Discover`, `CreatorProfile`, `SpaceLeaderboardTab`…). GoLive's setup-trace panel is the one partial exception.
- ✅ **Error boundaries are solid** — 3 real layers: Sentry root (`main.tsx:67`), global `ErrorBoundary` (`App.tsx:352`), route-level `RouteErrorBoundary` with retry (`App.tsx:354`). Caveat: single instance around all `<Routes>`, not per-route.
- 🟡 **No list virtualization** anywhere. `StreamChat.tsx:98` renders every message unvirtualized w/ AnimatePresence (unbounded DOM on hottest realtime path); `Leaderboard.tsx:157`, `Discover` append-only.
- 🟢 ~110 `<img>` (34%) lack `loading=`; hot list items `GlobalEventCard`, Leaderboard rows, StreamChat rows not memoized.

## 4. Components & design system (Agent A)
- 🔴 **Green brand violation at scale** — `#00FF85` in 128 places / 18 files, leaking into **platform UI**: `founderoffers/*`, `aria/GlobalAriaLauncher.tsx`, `lib/versionCheck.ts`, `index.css`, admin pages. CLAUDE.md forbids green. (AryaXO/artistroster white-label sites may be intentionally themed — **needs your ruling**; confine via theme token if exempt.)
- 🟡 **1,053 hardcoded hex colors** in src; a near-black palette (`#0A0A0A`×201, `#141414`, `#050505`, `#1E1E1E`) competing with `--background`; brand gradient hand-rolled as `from-[hsl(220_100%_62%)]…` in 12+ spots despite a `bg-brand-gradient` utility existing.
- 🟡 **53% of buttons bypass the design system** (816 raw `<button>` vs 713 `<Button>`); 39% of inputs. Root cause of most color/shadow drift. No `gradient`/`brand` variant on `ui/button.tsx`.
- 🟡 **Two toast systems** live simultaneously — sonner (231 files) vs shadcn toast (47). Pick sonner, migrate 47, delete the other.
- 🟡 **Dead/parallel code:** `videos/VideoUploadModal.tsx` (unimported); folder pairs `creator-profile/`↔`creatorprofile/`, `discover/`↔`discovery/`; two feed cards (`FeedCard` vs `DiscoveryFeedCard`); 3 EmptyState impls.
- 🔴 **99 components >300 lines, 8 >1,000** — `Stream.tsx` (1,315), `EventPage.tsx` (1,196), `CreatorProfile.tsx` (1,177), `SpaceClassroomTab.tsx` (1,168) — all on money/streaming paths, highest merge-conflict/regression risk with Lovable+Claude both editing.
- ✅ **Spacing is clean** (only 11 arbitrary-px values) — the 4px-scale problem barely exists.

## 5. Type safety / deploy hygiene (routes+bundle slice)
- 🟡 **453 `(supabase as any)` casts across 171 files** — types.ts regen overdue; the cast habit is systemic.
- 🟡 **141 edge functions ship wildcard CORS** — pending prod-domain decision.
- 🟡 **Deploy-state drift:** migrations `20260618` (whitelabel) + `20260620` (events social) may be undeployed while Lovable migrations run through 2026-07-01. Confirm deploy state.
- ✅ `.env` untracked (only `.env.example` in git).

## 6. Skool/Whop gap summary
- **Skool (simplicity):** blocked by design-system fragmentation — 53% raw buttons, 1,053 rogue hexes, green leak, 2 toast systems, duplicate cards/folders. Phase 1 target.
- **Whop (robustness):** payments are structurally sound (RLS 100%, signature-verified webhooks, server-computed fees, money-path UI errors) **except C-1**. Reliability gaps: 0/14 real error states, 136 silent writes, 1.7 MB entry chunk, unvirtualized chat. Phases 2–3 target.

## 7. Carried forward from 2026-06-11 audit (still open)
- 🔴 **mux-webhook auto-publishes recordings** regardless of stream privacy (`mux-webhook:187` `is_published=true`, `:151` `is_public=true`) `[needs approval — webhook]`.
- 🟡 **Ghost-live UI** — `mux-webhook` doesn't handle `video.live_stream.error`/reconnect-failure terminal; dead encoder leaves `status='active'` `[needs approval — webhook]`.
- 🟡 **Slug stream lookup** can resolve another creator's stream on a bad username (`Stream.tsx:264-275`).

## 8. Prioritized remediation backlog
| # | Item | Sev | Phase |
|---|---|---|---|
| 1 | **C-1 affiliate cash-out chain** | 🔴🔴 | now (approval) |
| 2 | mux-webhook auto-publish + ghost-live | 🔴 | 2 (approval) |
| 3 | 1.7 MB chunk (lazy PersistentPlayer/hls) + SW precache + 1.4 MB images | 🔴 | 3 |
| 4 | Green purge + design tokens + Button gradient variant | 🔴/🟡 | 1 |
| 5 | Systemic error states (shared `QueryErrorState`, stop swallowing `.error`) | 🟡 | 3 |
| 6 | 136 silent writes (lint rule) + canonical `useProfile()` | 🟡 | 2/3 |
| 7 | Edge error-response standardization (79 fns) + verify_jwt review | 🟡 | 2/4 |
| 8 | Decompose 8 files >1,000 lines (Stream, EventPage, CreatorProfile) | 🟡 | 1/3 |
| 9 | Toast consolidation, dead-code deletion, N+1 batching | 🟡 | 1/3 |
| 10 | 453 `as any` cleanup (post types regen), wildcard CORS lockdown | 🟢 | 4 |
