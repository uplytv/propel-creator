# BLAKE ONBOARDING — creator-educator setup runbook

Owner + Blake, work through this top-to-bottom in one sitting (~45 min).
Blake = Blake The Great · Instagram [@blakethegreat1312](https://www.instagram.com/blakethegreat1312) · trader + sports-betting educator, California.

What already ships in code (no in-app setup needed):

| Surface | URL | Source |
|---|---|---|
| Link hub (legacy, bespoke — untouched) | `/blake`, `/blakethegreat`, `/blake-the-great` | `src/pages/BlakeTheGreat.tsx` |
| Legacy Blueprint sales page + members area | `/blake-the-great/course`, `/blake-the-great/members` | bespoke pages (untouched) |
| Editorial website (business persona: "Work with me") | `/blake-site` | roster entry → `ArtistSiteTemplate` |
| Blog (3 posts live) | `/blake/blog` | roster `posts[]` |
| Community page (War Room, both tracks) | `/blake/community` | roster `community` |
| Courses (both tracks) | `/blake/courses` | roster `courses[]` |
| Roster card + curated search | `/roster`, in-app search | roster entry (automatic) |

Note: `/blake` intentionally still renders his legacy bespoke link page (it links to The Blueprint checkout, which works today). The new roster surfaces are reachable via the sticky section nav on `/blake-site`, `/blake/blog`, etc. If Blake later wants the roster hub instead, that's a one-line route swap — do not do it before he signs off.

---

## 1. Create Blake's creator account

1. Blake signs up at `/auth` (creator persona) with an email he controls — suggest `blake@blakethegreat.com` (the address already on his pages).
2. Username: claim **blake** (matches roster slug) — do this before launch so nobody squats it.
3. Complete `/onboarding`; creator type: Trader / Educator.
4. Connect Stripe from the dashboard (Stripe Connect onboarding) **before** any paid tier goes live — the 95/5 split only works with a connected account.
5. Founding-creator badge: Blake is in the first-10 beta cohort — make sure his profile carries the founding-creator flag so `FoundingCreatorBadge` (`src/components/shared/FoundingCreatorBadge.tsx`) renders on his public profile.

## 2. Community: "The War Room"

Create one community (the in-app one; the marketing pages call it "Blake's War Room"):

- Name: **The War Room**
- Description (mirror the roster copy): one community, two desks — Stock Trading Floor (markets education: process, position sizing, risk management) and Betting Desk (bankroll units, line value, limits). Include both compliance lines (see §7).
- Feed categories: create **#trading** and **#betting** so every post is track-tagged from day one. Optional third: **#discipline** for cross-track posts.

## 3. Classroom: TWO module tracks

Create two module tracks that mirror the public course outlines (roster `courses[]` in `src/data/artistRoster.ts`):

**Track 1 — Trading Foundations** (8 lessons)
1. The risk-first mindset: why the downside gets decided first
2. Position sizing: let the stop set the share count, not your conviction
3. Stop-losses that actually stop you — and why moving them ends accounts
4. Reading a chart without fooling yourself
5. The written trade plan: one page, no exceptions
6. The trade journal: your only honest teacher
7. Tilt, revenge trades, and the discipline to walk away
8. Full process walk-through: a trade from idea to journal entry

**Track 2 — Smart Betting 101** (7 lessons)
1. Betting as entertainment: setting a bankroll your life doesn't need
2. Units: the sizing math that keeps you in the game
3. What a line is actually telling you (it's a price, not a prediction)
4. Expected value and the vig: why "locks" don't exist
5. Line shopping: paying less for the same bet
6. The ledger: tracking every bet like a business expense
7. Limits, cool-offs, and knowing when to stop — responsible play, always

## 4. Membership tiers — honest guidance (read before configuring)

**How gating actually works today:** tier gating is **hierarchical rank-based** — content unlocks when `tier_rank >= min_rank` (`src/hooks/useTierGating.ts`; classroom modules gate on `min_rank` too, see `src/components/space/PricingTab.tsx`). A higher-rank member sees everything below their rank.

**What that means for Blake:** truly-exclusive *parallel* tiers — "Trading-only" vs "Betting-only" where neither sees the other's content — are **not expressible** with the current model. Do not promise it. Two honest options:

- **Option A (recommended for launch): single all-access membership.** One tier, e.g. "War Room All-Access" at ~$97/mo (mirrors his legacy Blueprint price). Both tracks included. Simplest to sell, zero gating surprises.
- **Option B: ladder.** Rank 1 = "Trading Floor" (trading modules + #trading feed), Rank 2 = "All-Access" (adds Betting Desk). Works because it's hierarchical — but note the asymmetry: there is no way to buy Betting *without* Trading in this layout.

**Enhancement flag:** file "parallel tier scoping" (non-hierarchical, per-track tier → content mapping) as a product enhancement. Until it ships, Option A or B only.

Legacy note: The Blueprint ($97/mo via `create-blake-checkout` + `/admin/blake-subscribers`) is a separate, working system. Decide with Blake whether new sign-ups route to the UPLY-native membership (recommended) and Blueprint becomes legacy-only for existing subscribers. Do not delete anything.

## 5. Drip sequence (welcome flow)

In `/dashboard/drip-sequences` (workflow builder):

- Trigger: **new_subscriber** (`src/components/drip/workflowTriggers.ts`)
- Suggested 4-email welcome flow (all copy needs Blake's sign-off):
  1. Day 0 — "Welcome to the War Room": house rules, the risk-first ethos, links to both tracks, both compliance lines in the footer.
  2. Day 2 — "Start here: Trading Foundations lesson 1" + the position-sizing worksheet.
  3. Day 4 — "The Betting Desk rules": bankroll/unit template + responsible-play framing (21+, where legal, 1-800-GAMBLER).
  4. Day 7 — "Your first live session": invite to the next live Q&A / first stream.
- Emails send from notify.uply.tv (Resend) — every email footer must carry both compliance lines (§7).

## 6. First live stream + launch event

- **PPV/live:** set up Blake's first stream from `/go-live` — suggested format: "War Room Open House" (free or low-price PPV), agenda: 20 min risk-first walkthrough, 20 min bankroll math, 20 min Q&A. Stream chat is live via Supabase Realtime. Say the compliance lines on air at the start of each segment (yes, verbally).
- **Launch event + promoter links:** create the event from `/events/create`; add promoters via the event's promoter manager (`EventPromotersManager`) so early supporters get tracked promo links (`src/lib/eventPromo.ts`). Set `platform_fee_pct` deliberately; tier-based tickets are the canonical system.

## 7. COMPLIANCE CHECKLIST (non-negotiable — verify before announcing)

Exact lines:
- **Trading:** "Educational content only — not financial advice; trading involves risk of loss."
- **Betting:** "Entertainment/education only · 21+ · where legal · bet responsibly." + "Problem gambling help: call 1-800-GAMBLER."

Verify each surface:
- [x] `/blake-site` footer — both lines (roster `disclaimers`, rendered by `ArtistDisclaimers`)
- [x] `/blake/blog` list + every article footer — both lines (shared component) **and** inline at the end of each post body
- [x] `/blake/community` — both lines in the description AND directly under the Join CTA
- [x] `/blake/courses` + each course page — track-appropriate line in each course summary AND under the Enroll CTA
- [ ] In-app community description + pinned post — paste both lines
- [ ] Classroom module intros — trading line on Track 1 lesson 1, betting line on Track 2 lesson 1
- [ ] Drip emails — both lines in every footer
- [ ] Live streams — verbal disclaimer on air + in stream description
- [ ] Blake's IG bio/link posts pointing at UPLY — "education only" phrasing
- [ ] Legacy pages (`/blake-the-great/course`) already carry a risk disclaimer — leave as-is

Content rule going forward: **no fabricated or unverifiable numbers anywhere** — no win rates, no P&L screenshots presented as typical results, no "turn $X into $Y" framing on any NEW surface. Testimonials only with written permission + "results not typical" context.

## 8. Placeholders awaiting BLAKE'S SIGN-OFF (in `src/data/artistRoster.ts`)

Nothing below goes live as fact until Blake confirms it in writing:

1. `milestones` — 3 of 4 entries are `[Blake: …]` prompts (start year/story, risk-rule moment, when betting entered).
2. `stats` → "Years trading" = `[Blake: #]`.
3. Community `priceUsd: 97` — placeholder mirroring his legacy Blueprint price; confirm or change.
4. Community perk cadences ("weekly" breakdowns, "monthly" Q&A) — delivery promises he must commit to.
5. Course prices — Trading Foundations `$149`, Smart Betting 101 `$99` — placeholders; confirm.
6. Course durations — both `[TBC]` until content is recorded.
7. `bookingEmail` / email social — `blake@blakethegreat.com` (from his legacy page); confirm it's monitored.
8. X/Twitter link — currently a search URL (from his legacy page); replace with his real handle URL.
9. `joinedAt: 2026-07-01` — cosmetic "Est." date; confirm.
10. Portrait photo — reused from his existing pages; confirm he wants it on the new site.
11. All three blog posts — written in his voice with zero performance claims; he should read and sign off before promotion.

## 9. Known gaps / notes for the owner

- Roster hub card (`/roster`) links to `/blake` → his legacy bespoke page, which does not link onward to `/blake-site`. Acceptable for launch; if desired later, add one link row to `BlakeTheGreat.tsx`'s `LINKS` array (one-line change, needs no restructure).
- Legacy pages still show unverified claims ($70K→$500K, 614%, 72%, testimonials). They predate this onboarding and were left untouched per scope — **strongly recommend** a follow-up pass with Blake to either substantiate or soften them; they are the biggest compliance risk on his presence.
- "Parallel tier scoping" enhancement (§4) — file it so Trading-only vs Betting-only tiers become expressible.
