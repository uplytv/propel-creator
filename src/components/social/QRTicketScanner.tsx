import { useState, useRef, useEffect } from "react";
import { X, Camera, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface QRTicketScannerProps {
  eventId: string;
  onClose: () => void;
}

export default function QRTicketScanner({ eventId, onClose }: QRTicketScannerProps) {
  const { user } = useAuth();
  const [manualCode, setManualCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; name?: string; ticketType?: string } | null>(null);
  const [checkedCount, setCheckedCount] = useState(0);

  useEffect(() => {
    // Fetch already-checked count
    (async () => {
      const { count } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("checked_in", true);
      setCheckedCount(count || 0);
    })();
  }, [eventId]);

  const validateTicket = async (code: string) => {
    if (!code.trim() || checking) return;
    setChecking(true);
    setResult(null);
    try {
      const { data: ticket, error } = await supabase
        .from("tickets")
        .select("*, profiles:user_id(display_name)")
        .eq("qr_secret", code.trim())
        .eq("event_id", eventId)
        .maybeSingle();

      if (error) throw error;

      if (!ticket) {
        setResult({ valid: false });
        return;
      }

      if (ticket.checked_in) {
        setResult({ valid: false, name: ticket.profiles?.display_name || "Unknown" });
        toast.error("Already checked in!");
        return;
      }

      // Mark as checked in
      await supabase
        .from("tickets")
        .update({ checked_in: true, checked_in_at: new Date().toISOString() })
        .eq("id", ticket.id);

      setResult({ valid: true, name: ticket.profiles?.display_name || "Guest", ticketType: ticket.ticket_type });
      setCheckedCount((c) => c + 1);
      toast.success("✓ Checked in!");
    } catch (err) {
      setResult({ valid: false });
      toast.error("Validation failed");
    } finally {
      setChecking(false);
      setManualCode("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0A0A0A" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="text-white font-bold text-lg">Check In Attendees</h2>
        <button onClick={onClose}>
          <X className="w-6 h-6 text-white/60" />
        </button>
      </div>

      {/* Stats */}
      <div className="px-4 py-3">
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.06)" }}>
          <p className="text-white/50 text-xs font-medium mb-1">Checked In</p>
          <p className="text-3xl font-black" style={{ color: "#3D7CFF" }}>{checkedCount}</p>
        </div>
      </div>

      {/* Camera placeholder */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div
          className="w-64 h-64 rounded-2xl flex flex-col items-center justify-center mb-6"
          style={{ border: "3px dashed rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.03)" }}
        >
          <Camera className="w-12 h-12 mb-3" style={{ color: "rgba(255,255,255,0.2)" }} />
          <p className="text-white/40 text-sm text-center">
            Camera QR scanning requires native build
          </p>
          <p className="text-white/25 text-xs mt-1">Use manual code entry below</p>
        </div>

        {/* Result display */}
        {result && (
          <div
            className="w-full rounded-xl p-4 mb-4 flex items-center gap-3 animate-in slide-in-from-bottom-4"
            style={{ background: result.valid ? "rgba(61, 124, 255,0.1)" : "rgba(255,59,48,0.1)" }}
          >
            {result.valid ? (
              <CheckCircle2 className="w-8 h-8 flex-shrink-0" style={{ color: "#3D7CFF" }} />
            ) : (
              <XCircle className="w-8 h-8 flex-shrink-0" style={{ color: "#FF3B30" }} />
            )}
            <div>
              <p className="text-white font-bold text-sm">
                {result.valid ? `✓ ${result.name}` : "Invalid Ticket"}
              </p>
              <p className="text-white/50 text-xs">
                {result.valid
                  ? result.ticketType || "General Admission"
                  : result.name
                  ? "Already checked in"
                  : "Code not found for this event"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Manual code entry */}
      <div className="px-4 pb-8">
        <div className="flex gap-2">
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && validateTicket(manualCode)}
            placeholder="Enter ticket code..."
            className="flex-1 px-4 py-3 rounded-xl text-white placeholder:text-white/30"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 16 }}
          />
          <button
            onClick={() => validateTicket(manualCode)}
            disabled={checking || !manualCode.trim()}
            className="px-5 py-3 rounded-xl font-bold text-sm transition-transform active:scale-95"
            style={{ background: "#3D7CFF", color: "#0A0A0A", opacity: checking ? 0.6 : 1 }}
          >
            {checking ? <Loader2 className="w-5 h-5 animate-spin" /> : "Check"}
          </button>
        </div>
      </div>
    </div>
  );
}
