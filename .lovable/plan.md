# ARIA Command Center — Additive Build Plan

Purely additive. No edits to existing ARIA chat, schemas, or flows.

## 1. Database (new only)

New table `aria_actions`:
- `id uuid pk`
- `creator_id uuid not null` (RLS-scoped)
- `intent text not null` (e.g. `members.list`, `revenue.summary`, `tier.create`, `email.draft`, `dm.draft`)
- `parsed_params jsonb not null default '{}'`
- `status text not null default 'pending'` — `pending | approved | executed | failed | cancelled`
- `result jsonb`
- `error text`
- `created_at timestamptz default now()`
- `executed_at timestamptz`

RLS: creator can select/insert/update only `where creator_id = auth.uid()`. No deletes from client.

Index on `(creator_id, created_at desc)`.

Rate limit helper: SQL function `aria_command_count_last_hour(_creator uuid) returns int` used by executor.

## 2. Edge Functions (new)

### `aria-intent-parser`
- Auth: verify JWT, derive `creator_id`.
- Input: `{ message: string }`.
- Calls Lovable AI Gateway (`google/gemini-3-flash-preview` — note: spec says claude-sonnet-4; we use Lovable AI Gateway since LOVABLE_API_KEY is auto-provisioned and avoids requiring an Anthropic key. Will note in delivery.) with a system prompt + JSON schema of supported intents.
- Returns `{ intent, params, confidence, summary, requires_approval }`.
- Inserts row into `aria_actions` with `status='pending'`.

Supported intent schemas:
- `members.list` — `{ sort?: 'ltv'|'joined'|'name', limit?: number, since?: ISODate, tier_id?: uuid }`
- `revenue.summary` — `{ window: 'mtd'|'last_30d'|'last_month', compare?: boolean }`
- `content.performance` — `{ window?: '7d'|'30d', limit?: number }`
- `tier.create` — `{ name, price_monthly, description? }`
- `email.draft` — `{ segment: 'all'|'active'|'churned'|'tier', tier_id?: uuid, subject, body }`
- `dm.draft` / `announcement.draft` — `{ body, audience: 'followers'|'members' }`

### `aria-intent-executor`
- Auth: verify JWT, derive `creator_id`.
- Input: `{ action_id: uuid }` (must belong to caller, status `pending` or `approved`).
- Reads action; for READ intents executes immediately. For WRITE intents requires `status='approved'` (UI sets it via update).
- Rate limit check: reject if >30 pending+executed in last hour.
- Read implementations: typed Supabase queries against existing tables (community members, subscriptions, posts/videos analytics).
- Write implementations:
  - `tier.create` → invokes existing `stripe-create-tier` function internally (server-to-server with service role + caller JWT) OR replicates its core (use existing function via fetch with original auth header).
  - `email.draft` → resolves segment to recipient list, sends via Resend connector (only when status=approved+sent flag).
  - `dm.draft` / `announcement.draft` → inserts into existing `direct_messages` / `posts` table after approval.
- Updates `aria_actions.status='executed'` + `result`.

## 3. UI

New route `/aria-command` registered in `App.tsx` (added as second-to-last route, before catch-all `/[username]`).

Components (new dir `src/features/aria-command/`):
- `pages/AriaCommandPage.tsx` — page shell with `BackNav`, ARIA branding (gradient + U-smiley reused), command input, history list.
- `components/CommandInput.tsx` — textarea + Send.
- `components/CommandToggle.tsx` — slim toggle inside existing ARIA panel; renders link to `/aria-command`. Added by *adding* a new optional prop-controlled section, not editing existing logic. (Implemented as a tiny additive component imported and conditionally rendered where the existing ARIA panel mounts — done via a non-destructive insertion next to the existing trigger.)
- `components/ParsedIntentCard.tsx` — shows intent name, params, Approve / Cancel for WRITE.
- `components/ResultCard.tsx` — renders read tables / write confirmations.
- `hooks/useAriaCommand.ts` — wraps `supabase.functions.invoke('aria-intent-parser')` and `aria-intent-executor`, plus realtime subscription on `aria_actions`.

Styling reuses existing tokens (`font-jakarta`, gradient `from-blue-500 to-purple-600`, `.mobile-safe-content`).

## 4. Guardrails

- Every WRITE requires explicit Approve click → updates `aria_actions.status='approved'` then calls executor.
- RLS enforced on `aria_actions`; executor double-checks `creator_id = auth.uid()` on every external table touched.
- Rate limit 30/hour via SQL helper checked in executor.
- All parses + executions logged to `aria_actions`.

## 5. Non-Goals (skipped)

YT/TikTok/IG, MCP exposure, multi-step chains, voice, persistent memory.

## 6. Demo Script (30s)

1. Creator opens `/aria-command`.
2. Types: *"Show my top 10 members by lifetime value."* → ARIA parses `members.list {sort:'ltv', limit:10}` → result table appears.
3. Types: *"Create a $19/mo Inner Circle tier with private streams access."* → ParsedIntentCard shows `tier.create {name:'Inner Circle', price_monthly:19, description:'private streams access'}` → Creator clicks **Approve** → Stripe product/price + DB tier created → ResultCard confirms with tier id.

## Files

New:
- `supabase/migrations/<ts>_aria_actions.sql`
- `supabase/functions/aria-intent-parser/index.ts`
- `supabase/functions/aria-intent-executor/index.ts`
- `src/features/aria-command/pages/AriaCommandPage.tsx`
- `src/features/aria-command/components/{CommandInput,ParsedIntentCard,ResultCard,CommandToggle}.tsx`
- `src/features/aria-command/hooks/useAriaCommand.ts`
- `src/features/aria-command/lib/intentSchemas.ts`

Edited (additive only):
- `src/App.tsx` — add `/aria-command` route immediately above the bare `/[username]` catch-all.

## Notes / Decisions

- **AI provider**: spec mentions Anthropic claude-sonnet-4. Lovable AI Gateway provides Gemini/GPT models with auto-provisioned `LOVABLE_API_KEY` (no user secret needed). Default to `google/gemini-3-flash-preview` for fast intent parsing. If you want strict Anthropic, I'll request an `ANTHROPIC_API_KEY` secret instead — confirm in chat.
- **Stripe tier creation**: reuses existing `stripe-create-tier` function by server-side fetch with the caller's JWT — no logic duplication.
- **Resend**: assumes existing Resend connector linked. If not, executor returns a friendly error and logs it.
