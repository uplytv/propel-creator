# LAUNCH-READINESS.md — UPLY desktop launch

**Date:** 2026-07-06 · **Pass:** autonomous full-platform improvement directive (Phases 0–6)
**State:** all work committed to `main` and synced to GitHub/Lovable. Working tree clean.

---

## 1. Go / No-Go

**GO for desktop beta launch — conditional on executing the publish manifest (§6) and the smoke tests (§7).**

Rationale: the launch-critical money path (creator signs up → member pays → money moves) is now
hardened well past the original audit: cart fulfillment fixed, dunning exists on the platform's own
plans, refunds pay the right person the right amount, disputes are handled, the affiliate cash-out
hole is closed, RLS gaps are shut, and the webhook work is covered by 35 pre-written tests. The
remaining risks (§5) are honest but none block a 10-creator desktop beta. **Production currently
runs NONE of the backend work until the publish manifest is executed** — that is the single gate.

---

## 2. P0/P1 findings — resolution status

| # | Finding | Status |
|---|---|---|
| P0 | C-1 affiliate cash-out (anonymous → Stripe transfer) | **Fixed** (`686b9972`) — needs fn deploy |
| P0 | Cart charged buyers, fulfilled nothing | **Fixed** (`99f815b1`) — finalize-cart-order pattern |
| P0 | No dunning on $97–$497 platform plans | **Fixed** (`f958c3d1` + `2f70f619`) — 3-touch + portal links |
| P0 | Refunds: full-PI on multi-ticket; cancelled events refunded resellers | **Fixed** (`09d3de47`) |
| P0 | No `charge.dispute.created` handling | **Fixed** (`f9e77fa7`, [WEBHOOK], test-first) |
| P0 | Refunds never clawed back creator wallets | **Fixed** (`f9e77fa7`, idempotent per refund) |
| P0 | Payouts tab showed platform-wide revenue to every creator | **Fixed** (`f958c3d1`) + sibling dashboard leak |
| P0 | Music tips/subs moved no money (phantom rows) | **Fixed** (`f958c3d1`) — real Stripe or honest fallback |
| P0 | 3 tables (of 505) without RLS | **Fixed** (`2b5bedfc`) |
| P0 | Stored XSS in classroom lesson HTML | **Fixed** (`2b5bedfc`) — DOMPurify |
| P0 | Leaderboard points self-awardable client-side | **Fixed** (`2f70f619`) — server-side triggers |
| P0 | Drip/broadcast/email-queue had no committed schedule | **Fixed** (`853e82c0`) — pg_cron heartbeat |
| P1 | Zero activity notifications | **Fixed** (`bd0bd8ec`) — platform-wide engine |
| P1 | No chat/community moderation | **Fixed** (`ee7110c5`) |
| P1 | All-or-nothing tier gating (ARPU cap) | **Fixed** (`3ca98ba4`) |
| P1 | Classroom "Error" lessons / blank player | **Fixed** (`d7899cf7`) — root cause + self-heal |
| P1 | Desktop lesson view missing paywall gate | **Fixed** (`d7899cf7`) |
| P1 | Username ↔ route collisions on the catch-all | **Fixed** (`2b5bedfc`) — reserved list + trigger |
| P1 | Unauthenticated checkout/ARIA endpoints unlimited | **Fixed** (`2b5bedfc`) — rate limits |
| P1 | Light-theme unreadable text (post dark→light flip) | **Fixed** (`30d709aa`) — ~48 components tokenized |

---

## 3. Major features shipped this pass

Guest trial checkout (GHL 2-step, card-on-file) · never-404 creator routing · unified artist-site
template (8 artists, creator-type-aware sections) · no-code website builder + 5 templates +
done-for-you call · community Store tab · buyer Purchases page + receipts · CRM v1→v2 (auto-sync,
stage auto-advance, drip hook, kanban, deal values) · Ads Manager v1 (drafts + ARIA copy; publish
honestly gated on platform API tokens) · ARIA voice mode · live commerce (real-time shelf, owned
state) · **PPV live + paid replays with vault-gated playback** · Skool-parity classroom (YouTube
import, resources, rich descriptions) · community depth (images, polls, threads, comment likes,
search, member profiles, RSVPs + points) · discovery ranking + real category counts + On-UPLY
events rail · 9 comparison SEO pages · platform-wide notifications · moderation suite · member
(free-account) persona · founding-creator badges.

---

## 4. Test suite summary

- **346 tests / 34 files.** Passing: 33 files including the new 35-test webhook-logic suite
  (written before the [WEBHOOK] changes) and both visual-regression suites (snapshots deliberately
  updated for the committed styling).
- **Known-failing (pre-existing, documented):** `src/lib/cooldownToast.test.tsx` — focus-timing
  a11y suite; failed at session baseline before any change of this pass; unrelated to shipped code
  paths. Post-launch fix.
- **Not covered (honest):** no end-to-end suite (Playwright) — the money path is covered at the
  logic level, not browser level. Edge functions are verified by typecheck + the extracted-logic
  tests only. Post-launch: e2e on trial→pay→access.

---

## 5. Remaining known risks (honest)

1. **Publish gap** — until §6 runs, production has none of this. The CRM error you saw is this.
2. **Mux signed playback** — PPV HLS URLs, if leaked, play without auth. Vault gating stops casual
   access; sharing defense needs signed playback (Mux signing key + [WEBHOOK] change). Do before
   large paid events.
3. **Reseller wallet clawback** on cancelled events: resale buyers are refunded, reseller wallet
   credit is not clawed back (product decision pending — flagged in `09d3de47`).
4. **No tax / single currency** — uncollected VAT/GST exposure at volume; USD only.
5. **Type-safety debt** — `(supabase as any)` casts on all new tables until `types.ts` regen (§6 step 4).
6. **Ads Manager publishes nothing** until Meta/Google developer tokens exist (labeled honestly in UI).
7. **First-load weight** — improved but still heavy (P2 backlog).
8. Concurrent-agent tree: every commit passed tsc+build, but surfaces touched by multiple builds
   (community tab, classroom) deserve a manual click-through in staging.

---

## 6. Publish manifest — run in this order

**Step 1 — migrations (all pending, in filename order):**
```
npx supabase login
npx supabase link --project-ref dbjlhmbgskvhuzqvqfrl
npx supabase db push
```
Applies (2026-07-05→06): founding badge · cancellation feedback · account_type · founding covers ·
creator_crm · ad_campaigns · cart_orders · automation heartbeat · platform dunning · server-side
points · notification engine · moderation · ppv_access · classroom richer · refund clawback ·
rls_gaps · reserved usernames · rate-limit cleanup · community depth · tier gating · crm_v2
(plus any earlier unapplied ones — `db push` orders them).

**Step 2 — edge functions:**
```
npx supabase functions deploy stripe-webhook create-platform-checkout check-platform-subscription \
  cancel-platform-subscription create-cart-checkout finalize-cart-order platform-dunning-check \
  get-product-download stripe-create-tip stripe-refund-ticket cancel-event \
  stripe-create-live-purchase track-affiliate-conversion stripe-pay-affiliate \
  aria-assistant aria-pricing-intelligence aria-fraud-sentinel aria-post-event-report \
  aria-event-copilot aria-attendee-concierge aria-content-repurpose
```

**Step 3 — secrets:** create `PLATFORM_DUNNING_CRON_SECRET` (Vault **and** edge-fn secret); verify
Vault secret `email_queue_service_role_key` exists (heartbeat migration warns with the exact
command if missing).

**Step 4 — types:** `npx supabase gen types typescript --linked > src/integrations/supabase/types.ts`,
commit, then progressively retire the `(supabase as any)` casts.

**Step 5 — owner inputs:** real booking URL to replace the `SETUP_CALL_URL` placeholder
(`src/components/pricing/plans.ts:82`); compress the two 1.4 MB PNGs; Meta/Google ad API tokens
(Phase-2 ad publishing); Mux signing key (PPV hardening).

---

## 7. Post-publish smoke tests (15 minutes)

1. Trial signup with a new email → Step 2 card form renders → test card → success step.
2. Trial signup with an existing free-account email → sails to Step 2 (guest checkout).
3. CRM → Sync contacts → contacts appear; buy something → contact auto-advances to Customer.
4. Cart: buy 2 products from different creators → both unlock, both wallets credited.
5. PPV: toggle PPV on a stream → second browser hits paywall → pay → instant unlock; end stream →
   replay still gated.
6. Classroom: open a previously-"Error" lesson as owner → self-heals; paste a YouTube URL in a new
   lesson → plays.
7. Community: post an image + poll, reply in a thread, RSVP an event → notification bell fires.

---

## 8. Post-launch backlog (prioritized)

1. E2E suite (Playwright) on the money path; fix cooldownToast suite.
2. Mux signed playback + reseller-clawback decision + buyer-fee refund policy.
3. Stripe Tax + multi-currency.
4. Order bumps/upsells; coupons UI surfacing (promo codes are enabled on cart + trial).
5. Live clipping → Shorts loop; VOD chapters render; watch-% lesson progress.
6. Ad publishing via Meta/Google APIs (tokens pending); CRM two-way email.
7. Perf: sub-400 KB critical path; IA cleanup of the "More" bucket; decompose 1,000-line files.
8. i18n foundation; full a11y audit; Clips & Shorts (Prompt 11); full design pass.
9. Event promoter links + seat holds/sections; members DMs; lesson quizzes/certificates.

---

*Prepared autonomously per the owner's directive. Every commit passed `tsc --noEmit` and
`npm run build`; webhook changes follow Hard Rule 1 (test-first, isolated, documented in
PHASE1-PAYMENTS.md). Companion reports: AUDIT.md, PHASE1-PAYMENTS.md, PHASE2-SECURITY.md.*
