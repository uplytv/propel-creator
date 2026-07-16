# Stripe Tax — Owner Setup (UPLY)

Stripe Tax support is wired into UPLY's checkout Edge Functions but is **OFF by
default**. Nothing changes until you complete the dashboard setup below and
flip the `ENABLE_STRIPE_TAX` secret. Enabling the flag *without* finishing the
dashboard setup is safe — sessions fall back to no-tax and log a warning — but
buyers won't be charged tax until the dashboard side is done.

## What's covered

The flag gates `automatic_tax` in these checkout functions:

- `create-platform-checkout` — UPLY platform plans (subscriptions)
- `stripe-create-checkout` — member → creator tier subscriptions
- `stripe-create-product-checkout` — single product purchases
- `create-cart-checkout` — multi-item cart purchases
- `purchase-ticket` — event ticket purchases (tier-based)
- `stripe-create-live-purchase` — live-stream shop + PPV purchases

Shared logic lives in `supabase/functions/_shared/stripeTax.ts`.

**Fee math is untouched.** The 95/5 split and all application fees continue to
be computed from the **pre-tax** amount. Stripe adds tax on top for the buyer;
tax collected is remitted per your registrations, it is not platform revenue.

**Fail-safe:** if a session creation fails with a tax-configuration error while
the flag is on, the function retries **once without** `automatic_tax` and logs
a structured `stripe_tax_fallback` warning (visible in Supabase function logs).
A misconfigured tax setup never loses a sale — but it also means those sales
collected no tax, so watch the logs after enabling.

## 5-step checklist (do these in order)

1. **Activate Stripe Tax** — Dashboard → Settings → Tax (or
   https://dashboard.stripe.com/settings/tax) → click through activation.
   Note: Stripe Tax has per-transaction pricing on transactions where tax is
   calculated; review Stripe's current Tax pricing before activating.

2. **Set your origin address** — same Tax settings page ("head office" /
   origin address). Automatic tax calculation fails without it. Use the
   business's registered address.

3. **Add tax registrations** — Dashboard → Tax → Registrations. Add every
   jurisdiction where you are registered to collect (e.g. your home state,
   plus any state/country where you've crossed nexus thresholds). Stripe Tax
   only *calculates and collects* where you have an active registration —
   everywhere else buyers are simply not charged tax. Use Stripe's monitoring
   tab to watch threshold exposure as sales grow.

4. **Set the default product tax code and default tax behavior** — Tax
   settings page → "Preset product tax code" and "Default tax behavior".
   - Preset tax code: most UPLY sales are digital (subscriptions, courses,
     PPV, digital products) — a general digital/SaaS code is the sensible
     default; physical live-shop merch and event tickets may warrant per-
     product codes later.
   - **Default tax behavior: set to "Exclusive"** (tax added on top). This is
     required: UPLY's checkouts use inline `price_data` and stored Prices that
     don't carry a `tax_behavior`, so Stripe uses this account default. If
     left unset, tax-enabled sessions fail (and fall back to no-tax).

5. **Flip the flag** — set the Edge Function secret and redeploy nothing
   (secrets apply on next invocation):

   ```sh
   npx supabase secrets set ENABLE_STRIPE_TAX=true
   ```

   To roll back at any time: `npx supabase secrets set ENABLE_STRIPE_TAX=false`
   (or unset it). Off restores the exact pre-tax behavior.

### After enabling — verify

- Run one real test purchase per flow you care about (a $1 test product is
  fine) from an address in a registered jurisdiction and confirm the Checkout
  page shows a tax line.
- Check Supabase function logs for `stripe_tax_fallback` warnings — any hit
  means a config gap (usually step 2 or 4).
- Confirm in Stripe Dashboard → Tax → Transactions that calculations are
  being recorded. Filing/remittance is on you (or Stripe Tax filing where
  available) — Stripe collects, it does not automatically file everywhere.

## Multi-currency — honest note (deferred)

Everything UPLY sells today is priced in **USD** (ticket tiers carry a
`currency` column but default to USD in practice). Stripe Tax itself is
currency-agnostic — it calculates on whatever the session charges — so this
integration works as-is for USD.

What we have **not** built is presentment currency (showing an EU buyer EUR
prices), because it requires a pricing-strategy decision first, not just code:

- **Stripe Adaptive Pricing** (Checkout setting, no code): Stripe converts
  and presents local currency at its FX rate. Easiest, but creators' listed
  prices become approximate and Stripe takes an FX margin.
- **Multi-currency Prices / `currency_options`**: set explicit per-currency
  amounts on each Price. Precise control, but every creator price point needs
  per-currency amounts and UI to manage them — a real product feature.
- **Charge USD everywhere** (current state): buyer's bank does the conversion.
  Zero work, worst buyer experience abroad.

Decision needed before implementation: who sets non-USD prices (platform FX
vs. creator-entered), how the 95/5 split reports across currencies, and
whether payouts to Connect accounts stay USD. Until then, multi-currency is
intentionally out of scope; the tax flag works independently of it.
