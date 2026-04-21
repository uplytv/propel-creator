---
name: Growth Plan Editor & AI Coach
description: In-app editing of the Growth Plan with AI suggestions, starter templates, version history, AI Coach widget, and auto-milestone snapshots when KPI targets are reached.
type: feature
---
- `growth_plans` + `growth_plan_versions` tables persist editable plans (auto + named snapshots).
- `GrowthPlanEditor.tsx` 4-tab modal: Edit / AI Suggestions / Templates / History.
- 5 starter templates in `src/lib/growthPlanTemplates.ts` (Coach, Course, Community, Content, Indie/SaaS).
- Edge functions: `growth-plan-suggest` (field-level alternatives) and `growth-coach-suggest` (3 weekly actions ranked by impact/effort, gemini-3-flash-preview, tool-calling).
- `AICoachWidget.tsx` mounted on Dashboard — floating sparkle button → bottom sheet with headline + 3 actions, regenerate on demand.
- `useMilestoneTracker` (mounted on Dashboard) auto-creates named version snapshots when members hit 25/50/100% of target, MRR hits 50/100%, or tier ≥ target tier. Dedup via `localStorage` (`uply_milestones_<planId>`) + DB name check; fires celebration toast.
- All edge functions surface 429/402 errors via toasts.
