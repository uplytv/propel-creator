# UPLY Tickets — Existing-System Audit & Phase 3 Gap Analysis

**Date:** 2026-06-11 · **Method:** read-only code map. Key claims verified against source.

## TL;DR
Ticketing is **~60–70% already built**. Phase 3 is **gap-fill, not greenfield**. The data model, purchase flow, inventory safety, resale, transfer, refund, and a working scanner all exist. The real gaps are: **festival-grade scanning (offline + gates + entry/exit + staff roles), rotating/signed QR, wristbands, live occupancy, and the 5 ARIA event agents.**

---

## What EXISTS today (with locations)

### Data model (migrations `20260320021550`, `20260421030122`, `20260506220432`)
- `events` (+ extended: venue lat/lng/geohash, doors_open_at, lineup jsonb, visibility, resale caps, live_stream_id)
- `ticket_tiers` — price, quantity_total/sold/**reserved**, per_user_limit, sales window, **perks jsonb**, pricing_mode (fixed/dynamic), squad_min_size, member_only_until
- `tickets` — tier_id, owner_id, order_id, **qr_code_secret** (private), qr_code_token (public url), status (active/used/refunded/transferred), scanned_at/by, transfer_count, **platform_fee + creator_earnings**
- `orders` — totals, fees, **idempotency_key**, payment_provider (stripe/storekit/wallet), line_items jsonb
- Resale: `ticket_listings`, `ticket_offers` (+ event resale_price_cap_pct)
- `event_waitlist`, `event_reminders`, `event_chat_messages` (realtime), `season_passes`(+events), `split_payments`(+participants)
- **All RLS-enabled.** Atomic inventory via SECURITY DEFINER fns: `reserve_ticket_inventory`, `confirm_ticket_inventory`, `release_ticket_inventory`. Scan via `check_in_ticket_secure(qr_secret, scanner)`. `rotate_ticket_qr(ticket_id)`.

### Edge functions
`create-event`, `publish-event`, `cancel-event`, `fetch-events`/`sync-global-events` (Ticketmaster/Eventbrite/SeatGeek), `go-live-at-event`, `purchase-ticket` (Stripe checkout, 5% fee, **atomic reserve before charge**), `stripe-refund-ticket`, `scan-ticket` (→ check_in_ticket_secure), `transfer-ticket` (rotates QR), `list-ticket-for-resale`, `buy-resale-ticket`, `resale-match-cron`, `send-ticket-email`, `send-event-reminders`, `apple-wallet-pass`/`google-wallet-pass` (**stubs**).

### Frontend
Pages: `Events` (organizer dash + check-in modal), `CreateEvent`, `EventPage` (public detail + purchase + QR), `TicketWallet` (my tickets), `TicketDetail`, `TicketSuccess`, `EventRSVP`, `GlobalEventDetail`, `StaffReentryRequests`. Components: `events/EventCheckIn` (**working @zxing camera scanner** + manual search + dup-debounce), `ResaleListings`, `SeatPicker`, `tickets/WalletPassButtons` (stubs). Routes for all of the above wired in `App.tsx`.

---

## GAPS vs the Phase 3 spec (what to actually build)

| Spec area | State | Gap to close |
|---|---|---|
| 3A data model | ~80% | Add `event_staff` (roles owner/manager/scanner/box_office + gate), append-only `scans` table (direction in/out, gate, result, device), `tickets.wristband_code` + `is_wristband` on tiers, `ticket_tiers.day_validity` (multi-day), live `occupancy` view |
| 3B purchase | ~85% | Multi-tier picker UI polish; **10-min reservation auto-release** (reserve exists; confirm TTL/cron); **confirm 95/5 reaches creators** (Connect transfer/payout — verify, do not touch math without sign-off) |
| 3C anti-fraud QR | ~50% | Current QR is a **static per-ticket secret** (rotated only on transfer). Add **HMAC short-lived rotating token** (30–60s) via edge fn + static fallback for print/wristband |
| 3D scanner | ~40% | EXISTS online; MISSING **offline mode** (pre-download manifest, local validate, queue+sync), **gate selection**, **in/out direction**, **green/red/yellow** full-screen feedback, **wristband activation/CSV** |
| 3E organizer dash | ~30% | EXISTS basic analytics; MISSING **staff management UI**, **real-time occupancy/scans-per-min**, **rejection feed**, **searchable scan logs + CSV export**, **comp/guest-list tools** |
| 3F ARIA agents | 0% | None of the 5 event agents (Copilot, Pricing Intelligence, Fraud Sentinel, Concierge, Post-Event) exist yet |
| 3G positioning | partial | Rotating-QR + in-platform face-value resale exist in primitive form; total-price-upfront + instant payout messaging not surfaced |

### Verified notes
- `purchase-ticket` (line 101) charges `price + 5%` to the platform Stripe account with **no `application_fee`/`transfer_data`/`on_behalf_of`** — the 95/5 appears to be *tracked* (`tickets.creator_earnings`) and paid out separately. Confirm the payout path before relying on it. **Do not modify per CLAUDE.md without explicit instruction.**
- `scan-ticket` authorizes only **creator or co_host** — no scanner/box_office role separation (needs `event_staff`).
- No separate scan log: `check_in_ticket_secure` flips `tickets.status` and sets one `scanned_at` — no entry/exit history or per-gate audit trail.

---

## Recommended Phase 3 order (revised for gap-fill)
1. **3A delta migration** — `event_staff`, append-only `scans`, wristband + day_validity columns, occupancy view (+ RLS). *Diff for approval.*
2. **3C/3D scanner** — rotating-QR edge fn; refactor `EventCheckIn` into a `/scan/:eventId` PWA with gates, in/out, offline queue.
3. **3E organizer** — staff mgmt, realtime occupancy, scan-log export.
4. **3F ARIA agents** — 5 new edge functions on the existing ARIA pattern.
5. Wristband CSV, wallet passes (need certs/keys), resale auction UI — as needed.

Each step: new code/new tables (additive), RLS in-migration, build+tsc green, commit per sub-section, STOP gates after 3B-equivalent and before 3F per the master prompt.
