import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, MessageCircle } from "lucide-react";

/** Buyer-facing "Ask ARIA" box — answers questions from the event's own data
 *  (set times, parking, re-entry, age limits) and flags when a human is needed. */
export default function EventConcierge({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<{ text: string; needsHuman?: boolean } | null>(null);

  const ask = async () => {
    if (q.trim().length < 3) return;
    setBusy(true);
    setAnswer(null);
    try {
      const { data, error } = await supabase.functions.invoke("aria-attendee-concierge", {
        body: { event_id: eventId, question: q.trim() },
      });
      if (error) throw error;
      setAnswer({ text: (data as any)?.answer ?? "I'm not sure — I'll check with the organizer.", needsHuman: (data as any)?.needs_human });
    } catch {
      setAnswer({ text: "Couldn't reach the concierge right now. Try again shortly.", needsHuman: true });
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm text-foreground hover:border-primary/50 transition-colors">
        <Sparkles className="w-4 h-4 text-primary" /> Ask ARIA about this event
      </button>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Ask ARIA</p>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Set times? Parking? Re-entry? Age limit?"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
        />
        <Button onClick={ask} disabled={busy || q.trim().length < 3}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ask"}
        </Button>
      </div>
      {answer && (
        <div className="mt-3 text-sm text-foreground bg-muted/30 rounded-lg p-3">
          {answer.text}
          {answer.needsHuman && <p className="text-xs text-muted-foreground mt-2">The organizer will follow up if this needs a human.</p>}
        </div>
      )}
    </div>
  );
}
