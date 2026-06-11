# UPLY Tickets — Architecture

End-to-end event ticketing built on the existing UPLY stack (Supabase + Stripe + Mux + Anthropic). This documents the parts added/extended on top of the ~65% that already existed (see `TICKETS_AUDIT.md`).

## Data model
Existing: `events`, `ticket_tiers`, `tickets`, `orders`, `ticket_listings`, `ticket_offers`, atomic inventory fns (`reserve/confirm/release_ticket_inventory`).

Added (migrations `20260611170000`–`20260611200000`):
- `event_staff(event_id, user_id, role[owner|manager|scanner|box_office], gate)` — who may scan/manage. RLS.
- `scans(event_id, ticket_id, scanned_by, gate, direction[in|out], result, device_id, lat/lng, scanned_at)` — **append-only** audit log (no UPDATE/DELETE policy). In `supabase_realtime`.
- `event_occupancy` view — accepted ins − accepted outs per event (`security_invoker`).
- `events.platform_fee_pct` (default 0.05, ≤0.30) — per-event configurable fee.
- `tickets.wristband_code` (unique); `ticket_tiers.is_wristband`, `ticket_tiers.day_validity`.
- Helper fns: `has_creator_access`, `can_scan_event`, `can_manage_event`, `my_scannable_events`, `record_scan`, `link_wristband`.

## Purchase flow (tier)
1. `EventTierPicker` → `purchase-ticket` edge fn: validates limits, **atomically reserves** inventory, creates a `pending` order, opens a Stripe Checkout session (`expires_at` 30 min) with `?order=<id>` on the success URL. Platform fee = `events.platform_fee_pct` (default 5%).
2. The Stripe webhook only finalizes the legacy `event_ticket` path, so the tier/resale flows are finalized **out of band** by `finalize-ticket-order` (the webhook is never modified, per CLAUDE.md):
   - Called from `TicketSuccess` on return, and by the `release-expired-ticket-holds` cron as a backstop.
   - Verifies the Stripe session is paid, **atomically claims** the order (`pending→processing`), creates one ticket per qty (QR auto-generated), marks `completed`, emails each ticket via `send-ticket-email`.
3. `release-expired-ticket-holds` (cron, ~5–10 min): releases inventory for abandoned holds **only after Stripe confirms not-paid** (race-safe), and finalizes paid-but-stranded orders.

## Resale (StubHub-style, anti-scalp)
`list-ticket-for-resale` (price-capped at `resale_price_cap_pct`) → `ResaleListings` browse → `buy-resale-ticket` → `finalize-ticket-order` (resale branch): **transfers** the ticket to the buyer, **rotates `qr_code_secret`** (the seller's old QR/screenshots go void — the core guarantee), marks the listing `sold`, credits the seller's `wallets.available_balance` (+ `transactions` row). Platform keeps the buyer-side fee; the 95/5 creator split is untouched.

## QR & anti-fraud
- Each ticket has a server-only `qr_code_secret` (32 random bytes, hex). The QR encodes that secret; validation is **always server-side** via `record_scan`.
- A secret is **rotated on transfer/resale**, so reselling or transferring voids prior codes.
- Duplicate use is caught by the append-only `scans` log: `record_scan` computes net presence (accepted ins − outs) and rejects a second `in` while inside (`rejected_duplicate`), and exits when not inside.
- Wristbands: `link_wristband` binds a barcode to a ticket; `record_scan` matches `qr_code_secret` **OR** `wristband_code`, so the wristband is the credential at gates.
- *Future enhancement:* 30–60s rotating HMAC display token to also defeat live screenshot-sharing of a single un-resold ticket (duplicate-scan rejection already mitigates re-use).

## Scanner (`/scan`, `/scan/:eventId`)
- `/scan` lists events you can scan (`my_scannable_events`). `/scan/:eventId` is the scanner: camera (zxing), **Entry/Exit** toggle, **gate** field, full-screen **ADMIT/CHECK/REJECT**, live occupancy, recent feed.
- **Offline mode:** if the network is down, scans are queued in `localStorage` and synced on reconnect / every 20s. (Validation happens on sync; full offline manifest validation is a future step.)
- Authorization is server-enforced: `record_scan` requires `can_scan_event` (creator or assigned `event_staff`).

## Organizer command center (`/events/:eventId/live`)
Realtime occupancy (Supabase Realtime on `scans` + `event_occupancy`), scans/min, gross sales, live scan feed, CSV export of the scan log, and an **ARIA insights** panel.

## ARIA event agents (edge fns, Anthropic)
`aria-event-copilot` (draft page + tiers + copy), `aria-pricing-intelligence` (advisory pricing), `aria-fraud-sentinel` (purchase/scan anomalies), `aria-attendee-concierge` (buyer Q&A from event data), `aria-post-event-report` (recap). Shared caller: `_shared/anthropic.ts`. Requires `ANTHROPIC_API_KEY`.

## Staff onboarding (event day)
1. Organizer → Events dashboard → an event → **Staff** → add people by `@username` with role + gate.
2. Each staff member signs into their own UPLY account → **`/scan`** → pick the event → scan.
3. Box office: use **Link a wristband** to bind pre-printed wristbands to tickets.
4. Watch **`/events/:eventId/live`** for occupancy, throughput, and rejections.

## Deploy checklist
1. Apply migrations in order: `20260611160000` (RLS), `170000` (staff/scans), `180000` (fee), `190000` (scan RPC), `200000` (wristbands).
2. Deploy edge fns: `purchase-ticket`, `finalize-ticket-order`, `buy-resale-ticket`, `release-expired-ticket-holds`, `aria-*` (5).
3. Schedule `release-expired-ticket-holds` every ~5–10 min.
4. Secrets: `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`.
5. Regenerate `src/integrations/supabase/types.ts`, then drop the temporary `(supabase as any)` casts in the new ticketing UI.

## Not yet built / needs external setup
Apple/Google Wallet passes (stubs — need PassKit/Google certs), 30–60s rotating-HMAC QR, CSV bulk wristband import, day-validity enforcement at scan for multi-day passes.
