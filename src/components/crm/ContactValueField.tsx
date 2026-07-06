import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useUpdateContactValue } from "@/hooks/useCrm";
import { formatCents, type CrmContact } from "./crmTypes";

/**
 * Inline-editable deal value (crm_contacts.value_cents).
 * Click to edit dollars; Enter/blur saves, Escape cancels, empty clears.
 */
export default function ContactValueField({
  contact,
  className = "",
}: {
  contact: CrmContact;
  className?: string;
}) {
  const updateValue = useUpdateContactValue();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startEdit = () => {
    setDraft(contact.value_cents != null ? String(contact.value_cents / 100) : "");
    setEditing(true);
  };

  const save = () => {
    setEditing(false);
    const trimmed = draft.trim();
    const valueCents =
      trimmed === "" ? null : Math.round(Number(trimmed.replace(/[$,]/g, "")) * 100);
    if (valueCents !== null && (!Number.isFinite(valueCents) || valueCents < 0)) return;
    if (valueCents === contact.value_cents) return;
    updateValue.mutate({ contactId: contact.id, valueCents });
  };

  if (editing) {
    return (
      <div className={`relative ${className}`}>
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
        <Input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-7 w-24 pl-5 text-xs tabular-nums"
          aria-label="Deal value in dollars"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className={`h-7 px-2 text-xs tabular-nums border border-transparent hover:border-border hover:bg-muted/50 transition-colors text-left ${
        contact.value_cents != null ? "text-foreground font-medium" : "text-muted-foreground/60"
      } ${className}`}
      aria-label="Edit deal value"
    >
      {contact.value_cents != null ? formatCents(contact.value_cents) : "Add value"}
    </button>
  );
}
