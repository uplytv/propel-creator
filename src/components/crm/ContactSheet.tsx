import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { CalendarClock, Loader2, Plus, StickyNote, Phone, Mail as MailIcon, CheckSquare, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAddCrmActivity, useCrmActivities, useToggleTaskDone, useUpdateContactStage } from "@/hooks/useCrm";
import ContactValueField from "./ContactValueField";
import {
  STAGES,
  kindLabels,
  sourceConfig,
  stageConfig,
  type CrmActivityKind,
  type CrmContact,
  type CrmStage,
} from "./crmTypes";

const kindIcons: Record<CrmActivityKind, typeof StickyNote> = {
  note: StickyNote,
  task: CheckSquare,
  call: Phone,
  email: MailIcon,
};

export default function ContactSheet({
  contact,
  open,
  onOpenChange,
}: {
  contact: CrmContact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: activities = [], isLoading } = useCrmActivities(open ? contact?.id ?? null : null);
  const addActivity = useAddCrmActivity();
  const toggleDone = useToggleTaskDone();
  const updateStage = useUpdateContactStage();

  const [kind, setKind] = useState<CrmActivityKind>("note");
  const [body, setBody] = useState("");
  const [dueAt, setDueAt] = useState("");

  if (!contact) return null;
  const src = sourceConfig[contact.source] ?? sourceConfig.manual;
  const SrcIcon = src.icon;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    addActivity.mutate(
      {
        contactId: contact.id,
        kind,
        body: body.trim(),
        dueAt: kind === "task" && dueAt ? new Date(dueAt).toISOString() : null,
      },
      { onSuccess: () => { setBody(""); setDueAt(""); } },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
              {(contact.name || contact.email)[0]?.toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate">{contact.name || contact.email}</span>
              {contact.name && (
                <span className="block text-xs font-normal text-muted-foreground truncate">{contact.email}</span>
              )}
            </span>
          </SheetTitle>
          <SheetDescription className="sr-only">Contact details and activity timeline</SheetDescription>
        </SheetHeader>

        {/* Details */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`${src.chip} text-[10px] px-1.5 py-0.5 gap-1 border-transparent`}>
              <SrcIcon className="w-3 h-3" />
              {src.label}
            </Badge>
            {contact.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Stage</p>
              <Select
                value={contact.stage}
                onValueChange={(stage) => updateStage.mutate({ contactId: contact.id, stage: stage as CrmStage })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {stageConfig[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Added</p>
              <p className="text-xs text-foreground pt-2">{format(new Date(contact.created_at), "MMM d, yyyy")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Deal value</p>
              <ContactValueField contact={contact} />
            </div>
            {contact.phone && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Phone</p>
                <p className="text-xs text-foreground">{contact.phone}</p>
              </div>
            )}
          </div>

          {/* Automations hint */}
          <div className="border border-border bg-muted/30 p-3 flex items-start gap-2">
            <Zap className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Automations: stage changes can enroll this contact in sequences — create one with trigger{" "}
              <code className="text-[10px] bg-muted px-1 py-0.5 text-foreground">crm_stage_customer</code>.{" "}
              <Link to="/dashboard/drip-sequences" className="text-primary underline underline-offset-2">
                Manage sequences
              </Link>
            </p>
          </div>
        </div>

        {/* Add note / task */}
        <form onSubmit={submit} className="mt-6 border border-border bg-card p-3 space-y-2">
          <div className="flex gap-2">
            <Select value={kind} onValueChange={(v) => setKind(v as CrmActivityKind)}>
              <SelectTrigger className="h-8 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(kindLabels) as CrmActivityKind[]).map((k) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {kindLabels[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {kind === "task" && (
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="h-8 text-xs flex-1"
                aria-label="Due date"
              />
            )}
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={kind === "task" ? "What needs to happen?" : "Write a note..."}
            className="min-h-[64px] text-sm"
          />
          <Button type="submit" size="sm" className="w-full gap-1.5" disabled={!body.trim() || addActivity.isPending}>
            {addActivity.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add {kindLabels[kind].toLowerCase()}
          </Button>
        </form>

        {/* Timeline */}
        <div className="mt-6">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Activity ({contact.notes_count})
          </h4>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No activity yet — add the first note above.</p>
          ) : (
            <ul className="space-y-2">
              {activities.map((a) => {
                const KindIcon = kindIcons[a.kind] ?? StickyNote;
                return (
                  <li key={a.id} className="border border-border bg-card p-3">
                    <div className="flex items-start gap-2.5">
                      {a.kind === "task" ? (
                        <Checkbox
                          checked={a.done}
                          onCheckedChange={(checked) =>
                            toggleDone.mutate({ activityId: a.id, contactId: contact.id, done: checked === true })
                          }
                          className="mt-0.5"
                          aria-label="Mark task done"
                        />
                      ) : (
                        <KindIcon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm text-foreground whitespace-pre-wrap ${a.done ? "line-through text-muted-foreground" : ""}`}>
                          {a.body}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                          <span>{kindLabels[a.kind]}</span>
                          <span>·</span>
                          <span>{format(new Date(a.created_at), "MMM d, yyyy")}</span>
                          {a.due_at && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <CalendarClock className="w-3 h-3" />
                                due {format(new Date(a.due_at), "MMM d, h:mm a")}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
