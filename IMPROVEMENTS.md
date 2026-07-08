# IMPROVEMENTS.md — Fable 5 Directive v2, branch `fable5-improvements`

**Date:** 2026-07-07 · **Gate:** `vitest` 390 passed / 0 failed (9 skipped) · `tsc --noEmit` clean · `npm run build` ✓

## Commits on this branch, by phase

| Phase | Commit | What |
|---|---|---|
| P2/P4 | `feat(ops)` | `money_events` audit trail (admin-read, service-write, never-throw logger) + `health-check` fn + admin System Health card |
| P1 | `test(webhook)` | Red-first suites (15 failed against current behavior → captured) + `credit_wallet_atomic` RPC migration |
| P1 | `[WEBHOOK]` | The three confirmed money bugs, isolated webhook-only commit |

## P0 findings → resolutions (with code evidence)

1. **Live purchases keyed by session id in the PI column** (`stripe-webhook` ~650/657 wrote `session.id`
   into `stripe_payment_intent_id`; refund/dispute lookups by real PI could never match). → Completion
   path now stores the real `session.payment_intent`; dual-lookup (real PI → legacy session-id) keeps
   every existing row working; dispute branch gains a sessions-list fallback. All other
   `live_purchases` readers audited (PPV entitlement, shop owned-state, admin aggregates) — none key
   on PI; unaffected.
2. **Sold-out tickets credited the creator and confirmed the buyer** (`reserve_event_ticket` failure
   logged "refund needed" then fell through to `updateWallet` + "Ticket Confirmed! 🎟️"). → On
   failure: no credit, no confirmation, programmatic refund guarded three ways (unique per-PI claim,
   Stripe idempotency key, already-refunded swallow), honest buyer notice, admin alert, outcome
   recorded. Happy path byte-identical.
3. **Wallet credits were read-then-write** (`updateWallet` selected the balance then wrote
   balance+credit — concurrent webhooks could lose a credit). → `credit_wallet_atomic` RPC: advisory
   per-creator lock + single-statement relative increment, per-PI idempotency guard replicated
   exactly, service-role-only. `updateWallet` keeps its signature (8 call sites untouched) and falls
   back to the byte-for-byte legacy path if the RPC isn't deployed yet — mid-deploy safe.

**Invariants verified in the diff itself:** 0 changed lines touch `constructEventAsync`/signature
verification; 0 touch the atomic `stripe_event_id` claim/stale-lock; 0 touch 95/5 fee math.
Red→green evidence and full before/after hunks: `PHASE1-PAYMENTS-V2.md`.

**Phase 3 spot-verification (this branch):** built bundle contains no service-role/Stripe/Mux/Resend
secrets — the single grep hit is the Developer API page generating its *own* `sk_live_`-prefixed UPLY
keys client-side (see recommendation 3). All `VITE_` vars are public-by-design.

## Self-review flags (what a second engineer would raise) — and status

- `log_money_event` is **not yet wired** into the money functions (the webhook was being edited
  concurrently; wiring one-liners are documented per-fn in the ops commit). *Deliberate; next pass.*
- Legacy `cs_…`-keyed `live_purchases` rows are handled by fallback but **not backfilled**.
  *Recommended one-time backfill after deploy; additive-only rule kept this out.*
- `health-check` returns HTTP 200 even when degraded. *Deliberate and documented in the file header:
  monitors should body-match `"status":"degraded"`; transport-level failure then unambiguously means
  the edge runtime itself is down.*

## Remaining recommendations, ranked by launch impact

1. Wire `log_money_event` into stripe-webhook / finalize-cart-order / finalize-ticket-order /
   refund paths (one line each, documented) — makes the audit table live.
2. One-time backfill of legacy session-keyed `live_purchases` rows to real PIs.
3. Move Developer-API key minting server-side (client-generated `sk_live_…` strings are a v1 smell).
4. Mux signed playback for PPV (needs owner's signing key) + reseller-clawback product decision.
5. Stripe Tax + multi-currency (post-launch, margin protection).

## Go / no-go: **GO** (unchanged from LAUNCH-READINESS.md, now stronger)

The critical path — creator signs up → member pays → money moves — is now protected by: 390-test
suite + 16 e2e browser tests (which already caught and killed a real funnel-killing P0), webhook
idempotency + dispute handling + refund clawback + atomic credits, dunning, RLS verified across 505
tables, and a health check for launch morning. Condition: run the publish (migrations
`20260707100000` + `20260707110000` and functions `stripe-webhook`, `health-check` join the Wave 4–5
addendum list in LAUNCH-READINESS.md §6).
