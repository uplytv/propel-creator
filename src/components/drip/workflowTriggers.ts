import { UserPlus, CalendarCheck, Sprout, Flame, ShoppingBag, Crown, Tag, type LucideIcon } from "lucide-react";

/**
 * Workflow trigger catalog.
 *
 * Derived from what server-side enrollment actually writes — do NOT add
 * entries here unless a DB trigger / edge function enrolls on that string:
 *
 *  - "new_subscriber" / "rsvp"
 *      supabase/migrations/20260706120000_automation_heartbeat.sql
 *      (enroll_subscriber_in_drip_sequences: AFTER INSERT ON subscribers,
 *       trigger_event = source === 'rsvp' ? 'rsvp' : 'new_subscriber')
 *      + client-side useAddSubscriber (src/hooks/useSubscribers.ts).
 *
 *  - "crm_stage_lead" | "crm_stage_engaged" | "crm_stage_customer" | "crm_stage_vip"
 *      supabase/migrations/20260706240000_crm_v2.sql
 *      (crm_enroll_on_stage_change: trigger_event = 'crm_stage_' || NEW.stage).
 *
 * drip_sequences.trigger_event is free text (no CHECK/enum — see
 * 20260416141659 and the note in 20260706240000), so no migration is needed
 * to support any of these values.
 *
 * "tag_added" is a legacy option the old UI offered but NOTHING enrolls on it
 * (no server trigger, no client code) — kept only as a display label for
 * pre-existing sequences, never offered for new ones.
 */
export interface WorkflowTrigger {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const WORKFLOW_TRIGGERS: WorkflowTrigger[] = [
  {
    value: "new_subscriber",
    label: "New subscriber",
    description: "Someone joins your email list (form, import, or API)",
    icon: UserPlus,
  },
  {
    value: "rsvp",
    label: "Event RSVP",
    description: "Someone RSVPs to one of your events",
    icon: CalendarCheck,
  },
  {
    value: "crm_stage_lead",
    label: "CRM stage → Lead",
    description: "A contact enters the Lead stage in your CRM",
    icon: Sprout,
  },
  {
    value: "crm_stage_engaged",
    label: "CRM stage → Engaged",
    description: "A contact enters the Engaged stage in your CRM",
    icon: Flame,
  },
  {
    value: "crm_stage_customer",
    label: "CRM stage → Customer",
    description: "A contact becomes a Customer (purchase, ticket, or subscription)",
    icon: ShoppingBag,
  },
  {
    value: "crm_stage_vip",
    label: "CRM stage → VIP",
    description: "A contact is marked VIP in your CRM",
    icon: Crown,
  },
];

/** Legacy / unknown trigger values that may exist on old rows. */
export const LEGACY_TRIGGERS: Record<string, { label: string; icon: LucideIcon }> = {
  tag_added: { label: "Tag added (legacy — no auto-enrollment)", icon: Tag },
};

export function getTriggerMeta(triggerEvent: string): { label: string; icon: LucideIcon; legacy: boolean } {
  const active = WORKFLOW_TRIGGERS.find(t => t.value === triggerEvent);
  if (active) return { label: active.label, icon: active.icon, legacy: false };
  const legacy = LEGACY_TRIGGERS[triggerEvent];
  if (legacy) return { label: legacy.label, icon: legacy.icon, legacy: true };
  return { label: triggerEvent, icon: Tag, legacy: true };
}

export function triggerLabel(triggerEvent: string, triggerTag?: string | null): string {
  const { label } = getTriggerMeta(triggerEvent);
  return triggerTag ? `${label} (tag: ${triggerTag})` : label;
}
