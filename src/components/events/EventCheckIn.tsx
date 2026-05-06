import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Search, X, Check, AlertTriangle, Users, Loader2, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCheckInTicket, useEventTickets, EventRow } from "@/hooks/useEvents";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { toast } from "sonner";

type CheckInState = "scanning" | "success" | "already_used" | "invalid";

export default function EventCheckIn({ event, onClose }: { event: EventRow; onClose: () => void }) {
  const [state, setState] = useState<CheckInState>("scanning");
  const [resultName, setResultName] = useState("");
  const [resultTime, setResultTime] = useState("");
  const [search, setSearch] = useState("");
  const [scannerOn, setScannerOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastScanRef = useRef<{ token: string; at: number }>({ token: "", at: 0 });
  const checkIn = useCheckInTicket();
  const { data: tickets, refetch } = useEventTickets(event.id);

  // Get attendee profiles
  const { data: attendeeProfiles } = useQuery({
    queryKey: ["event-attendee-profiles", event.id],
    enabled: !!tickets?.length,
    queryFn: async () => {
      const buyerIds = tickets!.map(t => t.buyer_id);
      const { data } = await supabase.from("profiles").select("user_id, display_name, username").in("user_id", buyerIds);
      return data || [];
    },
  });

  const checkedInCount = tickets?.filter(t => t.status === "used").length || 0;
  const totalCount = tickets?.length || 0;

  async function handleScan(token: string) {
    try {
      const result = await checkIn.mutateAsync(token);
      const profile = attendeeProfiles?.find(p => p.user_id === result.buyer_id);
      setResultName(profile?.display_name || profile?.username || "Attendee");
      setState("success");
      refetch();
    } catch (err: any) {
      if (err.message?.startsWith("ALREADY_USED:")) {
        setResultTime(err.message.split(":")[1]);
        setState("already_used");
      } else {
        setState("invalid");
      }
    }
    setTimeout(() => setState("scanning"), 3000);
  }

  // Camera QR scanner
  useEffect(() => {
    if (!scannerOn) return;
    let cancelled = false;
    (async () => {
      try {
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const back = devices.find(d => /back|rear|environment/i.test(d.label)) || devices[devices.length - 1];
        if (!back || !videoRef.current) { setScannerOn(false); toast.error("No camera available"); return; }
        const controls = await reader.decodeFromVideoDevice(back.deviceId, videoRef.current, (result) => {
          if (cancelled || !result) return;
          const text = result.getText();
          const now = Date.now();
          if (text === lastScanRef.current.token && now - lastScanRef.current.at < 2500) return;
          lastScanRef.current = { token: text, at: now };
          handleScan(text);
        });
        controlsRef.current = controls as any;
      } catch (e: any) {
        toast.error("Camera error", { description: e?.message ?? "Permission denied" });
        setScannerOn(false);
      }
    })();
    return () => {
      cancelled = true;
      try { controlsRef.current?.stop(); } catch {}
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOn]);

  async function handleManualCheckIn(ticketId: string, token: string) {
    await handleScan(token);
  }

  const filteredTickets = tickets?.filter(t => {
    if (!search) return true;
    const profile = attendeeProfiles?.find(p => p.user_id === t.buyer_id);
    const name = (profile?.display_name || profile?.username || "").toLowerCase();
    return name.includes(search.toLowerCase()) || t.qr_code_token.includes(search);
  });

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="font-bold text-foreground">Check In</h2>
          <p className="text-sm text-muted-foreground">{event.title}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-primary">{checkedInCount} / {totalCount}</span>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
      </div>

      {/* Full-screen status overlay */}
      <AnimatePresence>
        {state !== "scanning" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 z-50 flex flex-col items-center justify-center ${
              state === "success" ? "bg-primary" : "bg-destructive"
            }`}
          >
            {state === "success" && (
              <>
                <Check className="w-24 h-24 text-primary-foreground mb-4" />
                <p className="text-2xl font-bold text-primary-foreground">✓ {resultName}</p>
                <p className="text-primary-foreground/80">Checked In</p>
              </>
            )}
            {state === "already_used" && (
              <>
                <AlertTriangle className="w-24 h-24 text-white mb-4" />
                <p className="text-2xl font-bold text-white">Already Checked In</p>
              </>
            )}
            {state === "invalid" && (
              <>
                <X className="w-24 h-24 text-white mb-4" />
                <p className="text-2xl font-bold text-white">Invalid Ticket</p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual entry */}
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Search by name or scan QR token..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && search.length > 10) {
                handleScan(search);
                setSearch("");
              }
            }}
          />
          <Button
            size="sm"
            disabled={search.length < 10}
            onClick={() => { handleScan(search); setSearch(""); }}
          >
            Check In
          </Button>
        </div>
      </div>

      {/* Attendee list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filteredTickets?.map(ticket => {
          const profile = attendeeProfiles?.find(p => p.user_id === ticket.buyer_id);
          const isCheckedIn = ticket.status === "used";
          return (
            <div key={ticket.id} className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium text-foreground">{profile?.display_name || profile?.username || "—"}</p>
                <p className="text-xs text-muted-foreground font-mono">{ticket.qr_code_token.slice(0, 8)}...</p>
              </div>
              {isCheckedIn ? (
                <span className="text-xs text-primary flex items-center gap-1"><Check className="w-3 h-3" /> Checked In</span>
              ) : (
                <Button size="sm" variant="outline" onClick={() => handleManualCheckIn(ticket.id, ticket.qr_code_token)}>
                  Check In
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
