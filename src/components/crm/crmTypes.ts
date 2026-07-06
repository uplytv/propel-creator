import { Users, Mail, ShoppingBag, Ticket, CalendarDays, UserPlus, type LucideIcon } from "lucide-react";

export type CrmStage = "lead" | "engaged" | "customer" | "vip";
export type CrmSource = "member" | "subscriber" | "buyer" | "ticket" | "booking" | "manual";
export type CrmActivityKind = "note" | "task" | "call" | "email";

export interface CrmContact {
  id: string;
  creator_id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  phone: string | null;
  source: CrmSource;
  tags: string[];
  stage: CrmStage;
  notes_count: number;
  value_cents: number | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmActivity {
  id: string;
  contact_id: string;
  creator_id: string;
  kind: CrmActivityKind;
  body: string;
  due_at: string | null;
  done: boolean;
  created_at: string;
}

export const STAGES: CrmStage[] = ["lead", "engaged", "customer", "vip"];

export const stageConfig: Record<CrmStage, { label: string; chip: string; dot: string }> = {
  lead: { label: "Lead", chip: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  engaged: { label: "Engaged", chip: "bg-blue-500/10 text-blue-600", dot: "bg-blue-500" },
  customer: { label: "Customer", chip: "bg-purple-500/10 text-purple-600", dot: "bg-purple-500" },
  vip: { label: "VIP", chip: "bg-amber-500/10 text-amber-600", dot: "bg-amber-500" },
};

export const sourceConfig: Record<CrmSource, { label: string; icon: LucideIcon; chip: string }> = {
  member: { label: "Member", icon: Users, chip: "bg-purple-500/10 text-purple-600" },
  subscriber: { label: "Subscriber", icon: Mail, chip: "bg-blue-500/10 text-blue-600" },
  buyer: { label: "Buyer", icon: ShoppingBag, chip: "bg-indigo-500/10 text-indigo-600" },
  ticket: { label: "Ticket", icon: Ticket, chip: "bg-rose-500/10 text-rose-600" },
  booking: { label: "Booking", icon: CalendarDays, chip: "bg-amber-500/10 text-amber-600" },
  manual: { label: "Manual", icon: UserPlus, chip: "bg-muted text-muted-foreground" },
};

export const kindLabels: Record<CrmActivityKind, string> = {
  note: "Note",
  task: "Task",
  call: "Call",
  email: "Email",
};

/** "$1,250" (whole dollars) or "$1,250.50" when there are cents. */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
