
## What we're building

A new "Founder Services" pricing block with **3 tiers**:

| Tier | Price | What's included |
|---|---|---|
| DIY | $0 / included | Use UPLY's course builder yourself — current platform experience |
| Assisted Setup | **$149** (one-off) | 1:1 strategy call + course outline + setup checklist (no build) |
| Done-for-you Course Build | **$495** (one-off) | A UPLY rep builds your entire course from scratch — outline, modules, lessons, media uploads, pricing setup |

The middle "Assisted" tier price is a placeholder — easy to change or remove in one file (`src/data/founderOffers.ts`). I'll flag this in code with a comment.

Only the $495 tier creates a paid Stripe checkout right now. DIY is a free CTA into the existing course builder. Assisted starts with the same checkout flow but with its own price ID so you can toggle it on when ready.

## Payments approach

- **Direct platform charge to UPLY** — no Stripe Connect transfer, no 95/5 split. This is a UPLY service, not a creator sale.
- **New, isolated Edge Function** `create-founder-offer-checkout` — does not touch `stripe-webhook` or any existing money-path code (per CLAUDE.md hard rule).
- Stripe Checkout in `mode: "payment"`, hosted by Stripe, opens in a new tab.
- Uses the existing `STRIPE_SECRET_KEY` already in the project's edge env.

## Post-purchase flow

1. Buyer completes Stripe Checkout → redirected to `/founder-offers/success?session_id={CHECKOUT_SESSION_ID}`.
2. New `FounderOfferSuccess` page calls a second Edge Function `finalize-founder-offer` once on mount.
3. `finalize-founder-offer`:
   - Retrieves the Checkout Session from Stripe, verifies `payment_status === "paid"` and `metadata.offer === "done-for-you-course"`.
   - Inserts a row into a new `founder_offer_purchases` table (id, offer_key, buyer_email, buyer_name, amount_cents, stripe_session_id, stripe_payment_intent, status, created_at). RLS: insert/select restricted to service role; authenticated users can read their own.
   - Sends buyer confirmation email via existing Resend send-from `notify.uply.tv`.
   - Sends internal team notification email to a `FOUNDER_OFFER_NOTIFY_EMAIL` secret (you'll add this with `add_secret`).
4. Success page shows confirmation + "A rep will contact you within 1 business day."

## Where the pricing block appears

One reusable React component `<FounderOffersPricing variant="full" | "compact" />`.

- **Public landing** (`src/pages/Landing.tsx`) — `variant="full"`, new section near the existing pricing/value sections.
- **Onboarding** — `variant="compact"` card placed as an optional step at the end of the existing onboarding flow (skippable, never blocking).
- **Creator dashboard / Growth hub** — `variant="compact"` card in the upgrade/grow surface (Growth hub area).
- **Courses page** (creator-facing classroom management) — `variant="compact"` "Want us to build this for you?" card above the empty/manage state.

Compact variant = single highlighted "$495 Done-for-you" card with "Compare tiers →" link to a dedicated `/founder-services` page that shows all three tiers. This keeps the four embed points small and safe; the full pricing table lives in one place.

## New routes

Added BEFORE the `/:username` catch-all in `App.tsx` (verified per CLAUDE.md hard rule):
- `/founder-services` — full pricing page
- `/founder-offers/success` — post-Stripe success page
- `/founder-offers/canceled` — cancellation page

## Files

**New:**
- `src/data/founderOffers.ts` — tier definitions + price IDs
- `src/components/founderoffers/FounderOffersPricing.tsx` — reusable component (compact + full)
- `src/components/founderoffers/FounderOfferCard.tsx` — single tier card
- `src/pages/FounderServices.tsx` — `/founder-services` route
- `src/pages/FounderOfferSuccess.tsx` — `/founder-offers/success` route
- `src/pages/FounderOfferCanceled.tsx` — `/founder-offers/canceled` route
- `supabase/functions/create-founder-offer-checkout/index.ts`
- `supabase/functions/finalize-founder-offer/index.ts`
- `supabase/functions/_shared/transactional-email-templates/founder-offer-buyer-confirmation.tsx`
- `supabase/functions/_shared/transactional-email-templates/founder-offer-team-notification.tsx`
- SQL migration: `founder_offer_purchases` table with RLS + GRANTs

**Edited (minimal, additive only):**
- `src/App.tsx` — 3 new route entries above the catch-all
- `src/pages/Landing.tsx` — one new section
- Onboarding flow page — one new card on the final step
- Growth hub / dashboard page — one new card
- Courses manage page — one new card
- `_shared/transactional-email-templates/registry.ts` — register 2 new templates

**Untouched:** `stripe-webhook`, `mux-webhook`, `auth-email-hook`, any existing Stripe Connect / payout / fee code.

## Stripe setup steps I'll run

1. Create Stripe Product "Done-for-you Course Build" + Price `$495 USD one-time` via `stripe--create_stripe_product_and_price`, hardcode the returned `price_id` in `founderOffers.ts`.
2. (Optional later) Create Price for Assisted tier when you confirm the price.

## Secrets I'll need from you

- `FOUNDER_OFFER_NOTIFY_EMAIL` — the email address where internal team notifications go (e.g. you@uply.tv). I'll request it via `add_secret` after the rest is built.

`STRIPE_SECRET_KEY` and `RESEND_API_KEY` are already in your project's edge env per CLAUDE.md, so no extra setup there.

## Risk callouts

- Money path: new isolated checkout function, zero changes to existing webhooks or Connect logic. Direct platform charge — no transfers, no application fees, no split.
- `/:username` catch-all order verified after route additions.
- No changes to `src/integrations/supabase/types.ts` — I'll cast through `supabaseTyped` for the new table reads.
- Email templates use existing Resend infra and follow the dark email design tokens already in `mem://style/email-design-system`.

## What I'm NOT doing in this pass

- No fulfillment workflow / project management board for the rep (just the email notification).
- No automated scheduling (Calendly etc.).
- No revenue reporting integration into your existing creator analytics (this revenue is platform-owned, separate from creator earnings).
- No Assisted-tier checkout enabled by default — it ships disabled with a "Contact us" CTA until you set its price.

Approve and I'll ship it.
