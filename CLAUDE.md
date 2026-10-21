i CLAUDE.md — UPLY

This repo was generated and is still actively edited by Lovable (lovable.dev), synced two-way with GitHub. Claude Code and Lovable both push to this repo. Read this entire file before making changes.


1. What Lovable is (and why it matters here)


Lovable is an AI app builder that generates a Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui single-page app.
It has two-way GitHub sync: commits pushed from here appear in Lovable, and edits made in Lovable get pushed to this repo. Always git pull before starting work — Lovable may have pushed commits since your last session.
Keep commits clean and conventional. Do not rewrite history (git push --force is forbidden) — it breaks Lovable's sync.
Do not restructure the project layout (moving src/, renaming standard folders, changing the build tool). Lovable expects its conventions.


2. Lovable project conventions

src/
  components/        # shadcn/ui components live in components/ui/ — generated, edit carefully
  pages/             # route-level page components
  hooks/
  lib/               # utils.ts (cn helper), shared helpers
  integrations/
    supabase/
      client.ts      # AUTO-GENERATED Supabase client — do not hand-edit
      types.ts       # AUTO-GENERATED DB types from Supabase schema — do not hand-edit
supabase/
  functions/         # Edge Functions (Deno) — webhooks, server-side logic
  migrations/        # SQL migrations
  config.toml
index.html
vite.config.ts       # includes lovable-tagger plugin — leave it in place
tailwind.config.ts

Rules that follow from this:


Never hand-edit src/integrations/supabase/types.ts or client.ts. Types are regenerated from the live Supabase schema. If the schema changes, regenerate types (npx supabase gen types typescript) rather than patching by hand.
lovable-tagger appears in vite.config.ts / devDependencies. Do not remove it; it's how Lovable's visual editor maps components.
shadcn/ui components in src/components/ui/ are vendored copies — editing them is allowed but prefer wrapping/extending over modifying primitives.
Styling is Tailwind-only with CSS variables defined in index.css / tailwind.config.ts. Follow the existing design tokens (UPLY brand: blue→purple gradient, ~#3D7CFF → ~#B025FF; font Plus Jakarta Sans). Never introduce green as a brand color.


3. Environment & secrets


The frontend uses the Supabase anon/publishable key (safe to be client-side; RLS is the security boundary). It may be inlined in client.ts by Lovable — that is expected, do not "fix" it by breaking the client.
Server secrets (Stripe secret key, Mux tokens, Resend API key, Anthropic API key) live ONLY in Supabase Edge Function secrets (supabase secrets), never in frontend code, never committed.
There is no traditional .env consumed by the frontend in the Lovable setup; check before assuming Vite import.meta.env vars exist.


4. UPLY architecture (stack map)

LayerTechNotesFrontendVite + React + TS + Tailwind + shadcn/uiDeployed via VercelAuth / DB / StorageSupabase (Postgres + RLS)RLS is the security model — every table change needs RLS reviewPaymentsStripe ConnectCreator payouts, guarded plan-based rates (Free 3%, Pro/Studio 0%; legacy while disabled)SubscriptionsStripeMember → creator subscription gatingLive videoMuxRTMP ingest, HLS playback; integration is COMPLETE and stableEmailResendSends from notify.uply.tvAI (ARIA)Anthropic API5 specialized Claude agents, called from Edge FunctionsRealtime chatSupabase RealtimeStream chat

Critical money path (do not break): creator signs up → connects Stripe → member subscribes/pays → funds split → creator payout.

5. HARD RULES — never violate


NEVER modify the Stripe webhook handler or the Mux webhook handler (in supabase/functions/). These are battle-tested. If a change seems to require touching them, stop and ask first.
The /:username catch-all route must remain the LAST route in App.tsx. Any new route added above it; verify route order after every routing change.
Never overwrite working code wholesale. Make minimal, surgical diffs. Do not regenerate entire files that already work.
Never run destructive Supabase migrations (DROP, irreversible ALTER) without explicit confirmation.
Every new table or column gets RLS policies in the same migration. No table ships without RLS.
Do not touch payment-amount math (95/5 split, Stripe application fees) without explicit instruction.


6. Working agreements for Claude Code


Pull before work; small focused commits with clear messages so changes are legible in Lovable's history too.
Before editing any file, read it fully. Before editing routing, payments, or streaming code, read the related Edge Function as well.
After changes: npm run build must pass and npx tsc --noEmit must be clean before committing.
Prefer additive changes (new components, new functions) over modifying shared code.
When schema changes: write migration → apply → regenerate types.ts → then write app code.
If a task is ambiguous between "frontend tweak" and "touches money/auth/streaming," treat it as the latter and proceed cautiously.


7. Project context (business)


UPLY = operating system for creators. Free $0/month, Pro $99/month or $990/year, Studio $249/month or $2,490/year. Stripe processing extra. New rates pending activation. Solo founder. Bootstrap to $50K MRR before raising.
Launch-critical path is desktop launch with first 10 beta creators; stability > new features.
Post-launch roadmap includes Clips & Shorts (Mux Clipping API + Claude transcript analysis + /shorts feed) — do not pre-build unless asked.


8. Repo-specific details

See AUDIT.md (platform audit) and TICKETS_AUDIT.md / TICKETS_README.md (ticketing) for the full picture.

Scripts: `npm run dev` (Vite :8080) · `npm run build` · `npm run preview` · `npm test`.
Env note: Node lives at `C:\Program Files\nodejs` (not on PATH on the dev box); installs need `--legacy-peer-deps` (@zxing peer conflict). Frontend reads `VITE_SUPABASE_*` from `.env` (now gitignored).
Webhooks (DO NOT EDIT): Stripe handles checkout.session.completed, customer.subscription.deleted, invoice.payment_failed, charge.refunded, plus the legacy `event_ticket` path. Mux handles live_stream.active/idle/disconnected, asset.ready/errored/deleted. Known gaps (handle out-of-band, never in the webhook): no charge.dispute handler; webhook does NOT finalize tier/resale ticket orders (that's `finalize-ticket-order`).
Known fragile areas: RLS `USING(true)` on community/classroom tables was a revenue leak — fixed by migration `20260611160000` (deploy it). Brand tokens were green — fixed to blue→purple. Two parallel ticket systems (legacy event-level vs newer tier-based); the tier system is canonical going forward.

Ticketing additions (Phase 3) — routes: `/privacy`, `/terms`, `/scan`, `/scan/:eventId`, `/events/:eventId/live`.
New tables/views: `event_staff`, `scans` (append-only), `event_occupancy` (view); new columns `events.platform_fee_pct`, `tickets.wristband_code`, `ticket_tiers.is_wristband|day_validity`.
New functions: `has_creator_access`, `can_scan_event`, `can_manage_event`, `my_scannable_events`, `record_scan`, `link_wristband` (DB fns); edge fns `finalize-ticket-order`, `release-expired-ticket-holds`, `aria-event-copilot`, `aria-pricing-intelligence`, `aria-fraud-sentinel`, `aria-attendee-concierge`, `aria-post-event-report`.
Secrets used by edge fns: `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MUX_*`.
After deploying migrations, regenerate `src/integrations/supabase/types.ts` and remove the temporary `(supabase as any)` casts in the new ticketing UI.