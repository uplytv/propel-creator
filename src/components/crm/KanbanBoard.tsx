import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useUpdateContactStage } from "@/hooks/useCrm";
import ContactValueField from "./ContactValueField";
import { STAGES, formatCents, sourceConfig, stageConfig, type CrmContact, type CrmStage } from "./crmTypes";

function ContactCard({
  contact,
  onSelect,
  isOverlay = false,
}: {
  contact: CrmContact;
  onSelect?: (contact: CrmContact) => void;
  isOverlay?: boolean;
}) {
  const src = sourceConfig[contact.source] ?? sourceConfig.manual;
  const SrcIcon = src.icon;
  return (
    <div
      className={`border border-border bg-card p-3 space-y-2 ${
        isOverlay ? "shadow-lg" : "cursor-grab active:cursor-grabbing"
      }`}
      onClick={() => onSelect?.(contact)}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
          {(contact.name || contact.email)[0]?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground truncate">{contact.name || contact.email}</p>
          {contact.name && <p className="text-[10px] text-muted-foreground truncate">{contact.email}</p>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-1">
        <Badge variant="outline" className={`${src.chip} text-[9px] px-1 py-0 gap-0.5 border-transparent`}>
          <SrcIcon className="w-2.5 h-2.5" />
          {src.label}
        </Badge>
        <div onClick={(e) => e.stopPropagation()}>
          <ContactValueField contact={contact} />
        </div>
      </div>
    </div>
  );
}

function DraggableCard({ contact, onSelect }: { contact: CrmContact; onSelect: (contact: CrmContact) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: contact.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={isDragging ? "opacity-30" : undefined}>
      <ContactCard contact={contact} onSelect={onSelect} />
    </div>
  );
}

function StageColumn({
  stage,
  contacts,
  onSelect,
}: {
  stage: CrmStage;
  contacts: CrmContact[];
  onSelect: (contact: CrmContact) => void;
}) {
  const cfg = stageConfig[stage];
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const totalCents = contacts.reduce((sum, c) => sum + (c.value_cents ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`border bg-muted/20 flex flex-col min-w-[220px] ${
        isOver ? "border-primary/60 bg-primary/5" : "border-border"
      }`}
    >
      <div className="p-3 border-b border-border flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
        <span className="text-xs font-semibold text-foreground">{cfg.label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{contacts.length}</span>
        {totalCents > 0 && (
          <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{formatCents(totalCents)}</span>
        )}
      </div>
      <div className="p-2 space-y-2 overflow-y-auto max-h-[60vh] min-h-[80px] flex-1">
        {contacts.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/50 text-center py-6">Drop contacts here</p>
        ) : (
          contacts.map((c) => <DraggableCard key={c.id} contact={c} onSelect={onSelect} />)
        )}
      </div>
    </div>
  );
}

/**
 * Per-stage kanban view. Drag a card between columns to update its stage
 * (which also fires the crm_stage_<stage> drip automation server-side).
 */
export default function KanbanBoard({
  contacts,
  onSelect,
}: {
  contacts: CrmContact[];
  onSelect: (contact: CrmContact) => void;
}) {
  const updateStage = useUpdateContactStage();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Distance constraint keeps plain clicks working (open the sheet)
  // while a 6px drag starts a move between columns.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const activeContact = activeId ? contacts.find((c) => c.id === activeId) ?? null : null;

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const stage = over.id as CrmStage;
    if (!STAGES.includes(stage)) return;
    const contact = contacts.find((c) => c.id === active.id);
    if (!contact || contact.stage === stage) return;
    updateStage.mutate({ contactId: contact.id, stage });
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {STAGES.map((stage) => (
          <StageColumn
            key={stage}
            stage={stage}
            contacts={contacts.filter((c) => c.stage === stage)}
            onSelect={onSelect}
          />
        ))}
      </div>
      <DragOverlay>{activeContact ? <ContactCard contact={activeContact} isOverlay /> : null}</DragOverlay>
    </DndContext>
  );
}
