# Business Account Type — Implementation Plan

Reuses creator infrastructure. Additive-only migrations, RLS on every new table, `/:username` catch-all stays last, no webhook edits.

## 1. Database migration (single file, additive)

**profiles**
- Add `account_type text not null default 'creator' check (account_type in ('creator','business'))`
- Add `business_status text check (business_status in ('draft','claimed','live'))` (nullable; only set for businesses)

**business_details** (new)
- `id uuid pk`, `profile_id uuid unique fk profiles(id) on delete cascade`
- `business_name text not null`, `category text`, `tagline text`
- `address text`, `city text`, `phone text`, `email text`
- `hours jsonb`, `services jsonb`, `testimonials jsonb`
- `google_rating numeric(2,1)`, `google_reviews_count int`, `google_maps_url text`
- `hero_image_url text`, `logo_url text`
- `created_at`, `updated_at` + updated_at trigger
- RLS:
  - SELECT anon+authenticated: allowed when parent profile is `business_status='live'` OR when caller is owner OR admin
  - INSERT/UPDATE/DELETE: owner (profile.user_id = auth.uid()) OR admin
- GRANT select to anon/authenticated; full to service_role

**business_leads** (new)
- `id uuid pk`, `business_id uuid fk business_details(id) on delete cascade`
- `name text`, `phone text`, `email text`, `message text`
- `source text default 'profile'`, `handled boolean default false`
- `created_at`
- RLS:
  - INSERT anon+authenticated: allowed only when target business's profile is `business_status='live'`
  - SELECT/UPDATE/DELETE: only owner of the business's profile OR admin
- GRANT insert to anon+authenticated; select/update/delete to authenticated; full to service_role

**business_page_events** (new, for analytics)
- `id`, `business_id fk`, `event_type text check in ('view','call_tap','maps_tap','lead_submit','blog_view')`, `metadata jsonb`, `created_at`
- INSERT anon+authenticated when business is live
- SELECT: owner or admin

**View** `business_weekly_summary` — aggregates last 7 days by business_id: views, call_taps, leads, top blog post id. RLS via security_invoker so owner-only reads carry through.

## 2. Business profile page

Route: reuse existing `/:username` catch-all. `UsernameRedirect.tsx` (or the current resolver) branches on `profiles.account_type`:
- `creator` → existing creator site
- `business` → new `<BusinessSitePage/>`

New files:
- `src/pages/BusinessSitePage.tsx` — hero (name, tagline, ★ rating, click-to-call `tel:` button), services grid, testimonials, hours + Google Maps link, blog list (reuses `posts` table filtered by owner), lead form, "Powered by UPLY" footer. Mobile-first.
- `src/components/business/LeadCaptureForm.tsx` — zod-validated, inserts into `business_leads` via anon client, calls `notify-business-lead` edge function.
- `src/components/business/DraftBanner.tsx` — slim "Preview — claim this page" bar when status='draft' and viewer isn't owner.
- `src/hooks/useBusinessProfile.ts` — fetches details + posts.
- `src/hooks/useTrackBusinessEvent.ts` — logs view/call_tap/maps_tap/blog_view.

Discovery/sitemap: filter `business_status='live'` in the sitemap generator and any discovery query that includes profiles.

## 3. Email notification

New edge function `supabase/functions/notify-business-lead/index.ts`:
- Input: `{ lead_id }`. Loads lead + business + owner email (service role).
- Sends via Resend using existing `RESEND_API_KEY` and existing dark email template style.
- Called after lead insert from `LeadCaptureForm`.

## 4. Analytics

- `src/pages/BusinessAnalytics.tsx` — dashboard for the owner: views, call taps, maps taps, leads, top blog post (last 7d) read from `business_weekly_summary`.
- Reuse existing creator analytics components for shared metric cards.

## 5. Admin MCP tools

Extend `src/lib/mcp/index.ts` (do not touch existing tools). Add:
- `src/lib/mcp/tools/create-business-profile.ts`
- `src/lib/mcp/tools/update-business-profile.ts`
- `src/lib/mcp/tools/create-business-post.ts`
- `src/lib/mcp/tools/list-business-leads.ts`
- `src/lib/mcp/tools/get-business-analytics.ts`

Each handler:
1. `ctx.isAuthenticated()` check.
2. Admin guard: query `user_roles` via `has_role(getUserId(), 'admin')` using a Supabase client with the caller's bearer token; return `isError` if false.
3. Perform action using that same authed client so RLS still applies (admin RLS clauses cover it).

After edits: run `app_mcp_server--extract_mcp_manifest`, then deploy `mcp` edge function.

## 6. Rollout order

1. Migration (creates tables/RLS/grants/view).
2. Edge function `notify-business-lead` + deploy.
3. Frontend: BusinessSitePage, LeadCaptureForm, DraftBanner, analytics page, catch-all branch.
4. MCP tools + extract manifest + deploy `mcp`.
5. Typecheck; confirm `/:username` catch-all remains last in `App.tsx`.

## Technical notes

- Owner check pattern in RLS: `EXISTS (SELECT 1 FROM profiles p WHERE p.id = business_details.profile_id AND p.user_id = auth.uid())`.
- Admin check: `public.has_role(auth.uid(), 'admin')` (function already exists).
- `business_leads` insert-by-anon policy uses same EXISTS on `business_status='live'` to prevent lead spam to draft pages.
- Sitemap file (`public/sitemap.xml`) is static — dynamic sitemap generator, if any, must add the live-only filter; static file needs no change.
- No changes to Stripe/Mux webhooks. All migrations additive. `/:username` route stays last.
