import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, X, Check, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Users, WifiOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";

type ScanResult = "accepted" | "rejected_duplicate" | "rejected_void" | "rejected_not_found" | "queued";

interface LastScan {
  result: ScanResult;
  holder?: string;
  tier?: string | null;
  message?: string;
}

const tone: Record<ScanResult, { bg: string; label: string }> = {
  accepted: { bg: "bg-emerald-600", label: "ADMIT" },
  rejected_duplicate: { bg: "bg-amber-500", label: "CHECK" },
  rejected_void: { bg: "bg-destructive", label: "REJECT" },
  rejected_not_found: { bg: "bg-destructive", label: "REJECT" },
  queued: { bg: "bg-sky-600", label: "QUEUED" },
};

function deviceId() {
  let id = localStorage.getItem("uply_scan_device");
  if (!id) {
    id = (crypto.randomUUID?.() ?? String(Math.random())).slice(0, 12);
    localStorage.setItem("uply_scan_device", id);
  }
  return id;
}

export default function ScanEvent() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [eventTitle, setEventTitle] = useState("");
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [gate, setGate] = useState("Main");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [scannerOn, setScannerOn] = useState(false);
  const [last, setLast] = useState<LastScan | null>(null);
  const [recent, setRecent] = useState<LastScan[]>([]);
  const [occupancy, setOccupancy] = useState<number | null>(null);
  const [pending, setPending] = useState(0);
  const [manual, setManual] = useState("");
  const [wbOpen, setWbOpen] = useState(false);
  const [wbTicket, setWbTicket] = useState("");
  const [wbCode, setWbCode] = useState("");
  const [wbBusy, setWbBusy] = useState(false);

  const linkWristband = async () => {
    if (wbTicket.trim().length < 8 || !wbCode.trim()) return;
    setWbBusy(true);
    try {
      const { data, error } = await supabase.rpc("link_wristband", {
        p_qr_secret: wbTicket.trim(),
        p_event_id: eventId,
        p_wristband_code: wbCode.trim(),
      });
      if (error) throw error;
      if ((data as any)?.ok) {
        toast.success("Wristband linked", { description: "It now works as the ticket at gates." });
        setWbTicket(""); setWbCode("");
      } else {
        toast.error((data as any)?.message ?? "Couldn't link");
      }
    } catch (e: any) {
      toast.error("Link failed", { description: e?.message });
    } finally {
      setWbBusy(false);
    }
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastScanRef = useRef<{ token: string; at: number }>({ token: "", at: 0 });
  const queueKey = `uply_scan_queue_${eventId}`;

  // Authorize + load event title + occupancy
  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const { data: events } = await supabase.rpc("my_scannable_events");
      const match = (events ?? []).find((e: any) => e.event_id === eventId);
      if (!match) { setAuthorized(false); return; }
      setAuthorized(true);
      setEventTitle(match.title);
      if (match.gate) setGate(match.gate);
      refreshOccupancy();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const refreshOccupancy = useCallback(async () => {
    if (!eventId) return;
    const { data } = await supabase
      .from("event_occupancy")
      .select("current_occupancy")
      .eq("event_id", eventId)
      .maybeSingle();
    setOccupancy((data as any)?.current_occupancy ?? 0);
  }, [eventId]);

  const flash = (s: LastScan) => {
    setLast(s);
    setRecent((r) => [s, ...r].slice(0, 12));
    setTimeout(() => setLast(null), 1800);
  };

  // Offline queue helpers
  const enqueue = (qr: string) => {
    const q = JSON.parse(localStorage.getItem(queueKey) || "[]");
    q.push({ qr, direction, gate, device_id: deviceId(), ts: Date.now() });
    localStorage.setItem(queueKey, JSON.stringify(q));
    setPending(q.length);
  };

  const flushQueue = useCallback(async () => {
    const q = JSON.parse(localStorage.getItem(queueKey) || "[]");
    if (!q.length || !navigator.onLine) return;
    const remaining: any[] = [];
    for (const item of q) {
      try {
        await supabase.rpc("record_scan", {
          p_qr_secret: item.qr,
          p_event_id: eventId,
          p_direction: item.direction,
          p_gate: item.gate,
          p_device_id: item.device_id,
        });
      } catch {
        remaining.push(item);
      }
    }
    localStorage.setItem(queueKey, JSON.stringify(remaining));
    setPending(remaining.length);
    refreshOccupancy();
  }, [eventId, queueKey, refreshOccupancy]);

  useEffect(() => {
    setPending(JSON.parse(localStorage.getItem(queueKey) || "[]").length);
    const onOnline = () => flushQueue();
    window.addEventListener("online", onOnline);
    const iv = setInterval(flushQueue, 20000);
    return () => { window.removeEventListener("online", onOnline); clearInterval(iv); };
  }, [flushQueue, queueKey]);

  const doScan = useCallback(async (qr: string) => {
    if (!navigator.onLine) {
      enqueue(qr);
      flash({ result: "queued", message: "Saved — will sync when online" });
      return;
    }
    try {
      const { data, error } = await supabase.rpc("record_scan", {
        p_qr_secret: qr,
        p_event_id: eventId,
        p_direction: direction,
        p_gate: gate,
        p_device_id: deviceId(),
      });
      if (error) throw error;
      const r = data as any;
      flash({ result: r.result, holder: r.holder, tier: r.tier, message: r.message });
      refreshOccupancy();
    } catch (e: any) {
      // Network failure -> queue; other errors -> show reject
      if (!navigator.onLine) {
        enqueue(qr);
        flash({ result: "queued", message: "Saved offline" });
      } else {
        flash({ result: "rejected_not_found", message: e?.message ?? "Scan failed" });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, direction, gate, refreshOccupancy]);

  // Camera
  useEffect(() => {
    if (!scannerOn) return;
    let cancelled = false;
    (async () => {
      try {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          stream.getTracks().forEach((t) => t.stop());
        } catch { /* permission prompt */ }
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const back = devices.find((d) => /back|rear|environment/i.test(d.label)) || devices[devices.length - 1];
        if (!back || !videoRef.current) { setScannerOn(false); toast.error("No camera available"); return; }
        const controls = await reader.decodeFromVideoDevice(back.deviceId, videoRef.current, (result) => {
          if (cancelled || !result) return;
          const text = result.getText();
          const now = Date.now();
          if (text === lastScanRef.current.token && now - lastScanRef.current.at < 3000) return;
          lastScanRef.current = { token: text, at: now };
          doScan(text);
        });
        controlsRef.current = controls as any;
      } catch (e: any) {
        toast.error("Camera error", { description: e?.message ?? "Permission denied" });
        setScannerOn(false);
      }
    })();
    return () => { cancelled = true; try { controlsRef.current?.stop(); } catch { /* noop */ } controlsRef.current = null; };
     
  }, [scannerOn, doScan]);

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <SEOHead title="Scanner" description="Event scanner" />
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <p className="text-foreground font-semibold">You're not assigned to scan this event.</p>
        <Button variant="outline" onClick={() => navigate("/scan")}>Back to my events</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead title={`Scan · ${eventTitle}`} description="Event check-in scanner" />

      {/* Full-screen result flash */}
      <AnimatePresence>
        {last && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center text-white ${tone[last.result].bg}`}
          >
            {last.result === "accepted" ? <Check className="w-24 h-24 mb-3" /> :
             last.result === "queued" ? <WifiOff className="w-24 h-24 mb-3" /> :
             last.result === "rejected_duplicate" ? <AlertTriangle className="w-24 h-24 mb-3" /> :
             <X className="w-24 h-24 mb-3" />}
            <p className="text-3xl font-black">{tone[last.result].label}</p>
            {last.holder && <p className="text-xl font-semibold mt-1">{last.holder}</p>}
            {last.tier && <p className="text-white/85">{last.tier}</p>}
            {last.message && <p className="text-white/80 mt-1">{last.message}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => navigate("/scan")} aria-label="Back"><X className="w-5 h-5 text-muted-foreground" /></button>
        <div className="text-center">
          <p className="font-bold text-foreground text-sm truncate max-w-[180px]">{eventTitle || "Scanner"}</p>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Users className="w-3 h-3" /> {occupancy ?? "—"} inside
            {pending > 0 && <span className="text-sky-500 flex items-center gap-0.5 ml-2"><WifiOff className="w-3 h-3" /> {pending} queued</span>}
          </p>
        </div>
        <div className="w-5" />
      </div>

      {/* Direction + gate controls */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button variant={direction === "in" ? "default" : "outline"} onClick={() => setDirection("in")} className="gap-2">
            <ArrowDownToLine className="w-4 h-4" /> Entry
          </Button>
          <Button variant={direction === "out" ? "default" : "outline"} onClick={() => setDirection("out")} className="gap-2">
            <ArrowUpFromLine className="w-4 h-4" /> Exit
          </Button>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Gate / entry point</label>
          <Input value={gate} onChange={(e) => setGate(e.target.value)} placeholder="Main" />
        </div>

        <Button variant={scannerOn ? "destructive" : "default"} className="w-full" onClick={() => setScannerOn((s) => !s)}>
          {scannerOn ? <><CameraOff className="w-4 h-4 mr-2" /> Stop camera</> : <><Camera className="w-4 h-4 mr-2" /> Scan tickets</>}
        </Button>
        {scannerOn && (
          <div className="rounded-lg overflow-hidden border border-border bg-black aspect-square max-h-[50vh]">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          </div>
        )}

        {/* Manual entry */}
        <div className="flex gap-2">
          <Input
            placeholder="Or type/paste ticket code"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && manual.length > 8) { doScan(manual.trim()); setManual(""); } }}
          />
          <Button disabled={manual.length < 8} onClick={() => { doScan(manual.trim()); setManual(""); }}>Go</Button>
        </div>

        {/* Wristband activation (box office) */}
        <button onClick={() => setWbOpen((o) => !o)} className="text-xs text-muted-foreground underline">
          {wbOpen ? "Hide" : "Link a wristband"}
        </button>
        {wbOpen && (
          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="text-xs text-muted-foreground">Scan/enter the ticket code, then the wristband barcode.</p>
            <Input placeholder="Ticket code (QR)" value={wbTicket} onChange={(e) => setWbTicket(e.target.value)} />
            <Input placeholder="Wristband barcode" value={wbCode} onChange={(e) => setWbCode(e.target.value)} />
            <Button className="w-full" disabled={wbBusy || wbTicket.length < 8 || !wbCode.trim()} onClick={linkWristband}>
              {wbBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Link wristband"}
            </Button>
          </div>
        )}
      </div>

      {/* Recent scans */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <p className="text-xs text-muted-foreground mb-2">Recent</p>
        {recent.length === 0 && <p className="text-sm text-muted-foreground">No scans yet.</p>}
        {recent.map((s, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border/60">
            <div>
              <p className="text-sm text-foreground">{s.holder || s.message || "—"}</p>
              {s.tier && <p className="text-xs text-muted-foreground">{s.tier}</p>}
            </div>
            <span className={`text-xs font-semibold ${s.result === "accepted" ? "text-emerald-500" : s.result === "queued" ? "text-sky-500" : s.result === "rejected_duplicate" ? "text-amber-500" : "text-destructive"}`}>
              {tone[s.result].label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
