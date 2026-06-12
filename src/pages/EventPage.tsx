import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarDays, MapPin, Monitor, Globe, Users, Ticket, Bell,
  Download, Check, Clock, Loader2, Share2, ExternalLink, Plus, Minus, RefreshCw, Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import EventLiveNowBanner from "@/components/live/EventLiveNowBanner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import SEOHead from "@/components/SEOHead";
import BackNav from "@/components/BackNav";
import AppLayout from "@/components/layout/AppLayout";
import EventTabs from "@/components/social/EventTabs";
import EventTierPicker from "@/components/events/EventTierPicker";
import EventConcierge from "@/components/events/EventConcierge";
import { PurchaseOverlay } from "@/components/payments/PurchaseOverlay";
import SeatPicker from "@/components/events/SeatPicker";
import ResaleListings from "@/components/events/ResaleListings";
import { useAuth } from "@/context/AuthContext";
import { useEvent, useMyTicketForEvent, useClaimFreeTicket, useSetEventReminder } from "@/hooks/useEvents";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow, isBefore, differenceInMinutes } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const typeBadge: Record<string, { emoji: string; color: string; label: string }> = {
  virtual: { emoji: "🖥️", color: "bg-blue-500/20 text-blue-500", label: "Virtual" },
  in_person: { emoji: "📍", color: "bg-warning/20 text-warning", label: "In Person" },
  hybrid: { emoji: "🌐", color: "bg-violet-500/20 text-violet-500", label: "Hybrid" },
};

function Countdown({ date }: { date: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const target = new Date(date);
  if (isBefore(target, now)) return <span className="text-primary">Starting now!</span>;
  return <span>{formatDistanceToNow(target, { addSuffix: true })}</span>;
}

export default function EventPage() {
  const { username, slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: event, isLoading } = useEvent(slug);
  const { data: myTicket } = useMyTicketForEvent(event?.id);
  const claimFree = useClaimFreeTicket();
  const setReminder = useSetEventReminder();
  const [quantity, setQuantity] = useState(1);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [seatPickerOpen, setSeatPickerOpen] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [qrUpdatedAt, setQrUpdatedAt] = useState<Date | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [iosPrintHelpOpen, setIosPrintHelpOpen] = useState(false);
  const isIosOrSafari = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
    const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
    return isIOS || isSafari;
  }, []);
  const isSeated = (event as any)?.ticketing_mode === "seated";
  const seatMap = (event as any)?.seat_map as { rows?: number; cols?: number; blocked?: string[] } | null;

  // Get creator profile
  const { data: creatorProfile } = useQuery({
    queryKey: ["event-creator", event?.creator_id],
    enabled: !!event,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("display_name, username, avatar_url").eq("user_id", event!.creator_id).maybeSingle();
      return data;
    },
  });

  // Get attendee count & avatars
  const { data: attendees } = useQuery({
    queryKey: ["event-attendees", event?.id],
    enabled: !!event,
    queryFn: async () => {
      const { data } = await (supabase as any).from("tickets").select("buyer_id").eq("event_id", event!.id).eq("status", "active").limit(5);
      return data || [];
    },
  });

  const badge = event ? typeBadge[event.event_type] || typeBadge.virtual : null;
  const isPast = event ? isBefore(new Date(event.ends_at), new Date()) : false;
  const virtualRevealed = event?.virtual_link_unlocked_at || (event && differenceInMinutes(new Date(event.starts_at), new Date()) <= 30);
  const isHost = !!(event && user && event.creator_id === user.id);
  const isFree = !!event && (event.is_free || Number(event.ticket_price || 0) === 0);

  async function handleGetTicket() {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!event) return;

    if (isHost) {
      toast.success("You're the host of this event 🎤");
      return;
    }

    if (isFree) {
      await claimFree.mutateAsync(event);
      setConfirmOpen(true);
      return;
    }

    if (isSeated && seatMap?.rows && seatMap?.cols) {
      setSeatPickerOpen(true);
      return;
    }

    setCheckoutOpen(true);
  }

  async function handleRegenerateQr() {
    if (!myTicket?.id) return;
    setRegenerating(true);
    try {
      const { error } = await (supabase as any).rpc("rotate_ticket_qr", { p_ticket_id: myTicket.id });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["my-ticket"] });
      setQrUpdatedAt(new Date());
      toast.success("QR code refreshed", { description: "Your previous code is no longer valid." });
    } catch (e: any) {
      toast.error("Couldn't regenerate QR", { description: e?.message || "Try again in a moment." });
    } finally {
      setRegenerating(false);
    }
  }

  function buildTicketHtml(svgDataUri: string, opts?: { iframeFallback?: boolean }) {
    const when = format(new Date(event!.starts_at), "EEE, MMM d • h:mm a");
    const location = event!.event_type === "virtual" ? "Virtual" : ((event as any).venue_name || (event as any).location || "");
    const code = (myTicket?.qr_code_token || "").slice(0, 8).toUpperCase();
    // Dedicated print CSS for iframe fallback (iOS/Safari): forces letter page,
    // tight margins, exact color rendering, and a crisp pixelated QR that won't
    // get smoothed by the iPhone print pipeline.
    const iframePrintCss = opts?.iframeFallback ? `
  @page { size: auto; margin: 12mm; }
  html, body { width: 100%; height: auto; background: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  @media print {
    html, body { padding: 0 !important; margin: 0 !important; }
    .card { width: 78mm !important; max-width: 78mm !important; margin: 0 auto !important; padding: 6mm !important; border: 1.5pt dashed #000 !important; page-break-inside: avoid; break-inside: avoid; }
    .card h1 { font-size: 14pt !important; }
    .card .meta { font-size: 9pt !important; color: #000 !important; }
    .card .code { font-size: 10pt !important; }
    .card .foot { font-size: 7pt !important; color: #000 !important; }
    .qr { padding: 2mm !important; margin: 4mm auto !important; }
    .qr img {
      width: 52mm !important;
      height: 52mm !important;
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
      -ms-interpolation-mode: nearest-neighbor;
    }
  }
` : "";
    return `<!doctype html><html><head><title>Ticket — ${event!.title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0A0A0A}
  body{padding:32px;background:#fff}
  .card{max-width:380px;margin:0 auto;border:2px dashed #0A0A0A;border-radius:16px;padding:24px;text-align:center}
  h1{font-size:20px;font-weight:700;margin-bottom:8px}
  .meta{font-size:13px;color:#444;margin-bottom:4px}
  .qr{margin:20px auto;padding:12px;background:#fff;display:inline-block}
  .qr img{display:block;width:240px;height:240px;image-rendering:pixelated;image-rendering:-moz-crisp-edges;image-rendering:crisp-edges}
  .code{font-family:"Courier New",monospace;font-size:14px;letter-spacing:2px;margin-top:8px}
  .foot{margin-top:16px;font-size:11px;color:#777}
  @media print{body{padding:0}.card{border-color:#000}}
${iframePrintCss}
</style></head><body>
  <div class="card">
    <h1>${event!.title}</h1>
    <p class="meta">${when}</p>
    ${location ? `<p class="meta">${location}</p>` : ""}
    <div class="qr"><img src="${svgDataUri}" alt="Ticket QR"/></div>
    <p class="code">${code}</p>
    <p class="foot">Present this ticket at check-in. UPLY</p>
  </div>
  <script>window.onload=()=>{setTimeout(()=>{window.focus();window.print();},250);};</script>
</body></html>`;
  }

  function printViaIframe(html: string) {
    // Fallback for iOS/Safari where window.open is restricted: use a hidden iframe in the same document.
    return new Promise<void>((resolve, reject) => {
      try {
        const iframe = document.createElement("iframe");
        iframe.setAttribute("aria-hidden", "true");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        document.body.appendChild(iframe);
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) { iframe.remove(); reject(new Error("Iframe unavailable")); return; }
        doc.open();
        doc.write(html.replace(/<script[\s\S]*?<\/script>/g, ""));
        doc.close();
        const trigger = () => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            resolve();
          } catch (err) {
            reject(err as Error);
          } finally {
            setTimeout(() => iframe.remove(), 1000);
          }
        };
        setTimeout(trigger, 350);
      } catch (e) {
        reject(e as Error);
      }
    });
  }

  function handlePrintTicket() {
    const svg = qrWrapRef.current?.querySelector("svg");
    if (!svg || !event) {
      toast.error("Ticket not ready", { description: "Try again in a moment." });
      return;
    }
    setPrinting(true);
    const toastId = toast.loading("Preparing print view…");
    try {
      const svgStr = new XMLSerializer().serializeToString(svg);
      const svgDataUri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgStr)))}`;

      // iOS Safari often blocks or strips features from window.open; go straight to iframe fallback.
      if (isIosOrSafari) {
        const html = buildTicketHtml(svgDataUri, { iframeFallback: true });
        printViaIframe(html)
          .then(() => {
            toast.success("Print dialog opened", { id: toastId, description: "Use Share → Print if it didn't appear." });
            setIosPrintHelpOpen(true);
          })
          .catch(() => {
            toast.error("Couldn't open print dialog", { id: toastId, description: "Follow the on-screen steps to print." });
            setIosPrintHelpOpen(true);
          })
          .finally(() => setPrinting(false));
        return;
      }

      const w = window.open("", "_blank", "width=480,height=720");
      if (!w) {
        // Pop-up blocked — fall back to in-page iframe printing.
        const fallbackHtml = buildTicketHtml(svgDataUri, { iframeFallback: true });
        printViaIframe(fallbackHtml)
          .then(() => toast.success("Print view ready", { id: toastId, description: "Pick a printer to finish." }))
          .catch(() => {
            toast.error("Pop-up blocked", { id: toastId, description: "Allow pop-ups or follow the on-screen steps." });
            setIosPrintHelpOpen(true);
          })
          .finally(() => setPrinting(false));
        return;
      }
      const html = buildTicketHtml(svgDataUri);
      w.document.write(html);
      w.document.close();
      toast.success("Print view ready", { id: toastId, description: "Pick a printer to finish." });
      setPrinting(false);
    } catch (e: any) {
      toast.error("Couldn't print ticket", { id: toastId, description: e?.message || "Try again." });
      setPrinting(false);
    }
  }

  async function handleExportPdf() {
    const svg = qrWrapRef.current?.querySelector("svg");
    if (!svg || !event || !myTicket) {
      toast.error("Ticket not ready", { description: "Try again in a moment." });
      return;
    }
    setExportingPdf(true);
    const toastId = toast.loading("Generating PDF…");
    try {
      const svgStr = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const qrPng: string = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const size = 600;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("Canvas unavailable")); return; }
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0, size, size);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => reject(new Error("QR render failed"));
        img.src = url;
      });
      URL.revokeObjectURL(url);

      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();

      const cardW = 320, cardH = 460;
      const x = (pageW - cardW) / 2, y = 80;

      doc.setDrawColor(10, 10, 10);
      doc.setLineDashPattern([6, 4], 0);
      doc.setLineWidth(1.5);
      doc.roundedRect(x, y, cardW, cardH, 12, 12, "S");
      doc.setLineDashPattern([], 0);

      doc.setTextColor(10, 10, 10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      const title = doc.splitTextToSize(event.title, cardW - 40);
      doc.text(title, pageW / 2, y + 32, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(68, 68, 68);
      doc.text(format(new Date(event.starts_at), "EEE, MMM d • h:mm a"), pageW / 2, y + 60, { align: "center" });
      const loc = event.event_type === "virtual" ? "Virtual" : ((event as any).venue_name || (event as any).location || "");
      if (loc) doc.text(String(loc), pageW / 2, y + 76, { align: "center" });

      const qrSize = 220;
      doc.addImage(qrPng, "PNG", (pageW - qrSize) / 2, y + 100, qrSize, qrSize);

      doc.setFont("courier", "normal");
      doc.setFontSize(13);
      doc.setTextColor(10, 10, 10);
      const code = (myTicket.qr_code_token || "").slice(0, 8).toUpperCase();
      doc.text(code, pageW / 2, y + 360, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(119, 119, 119);
      doc.text("Present this ticket at check-in. UPLY", pageW / 2, y + 420, { align: "center" });

      const safe = (event.title || "ticket").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      doc.save(`${safe}-ticket.pdf`);
      toast.success("PDF downloaded", { id: toastId, description: "Ticket saved to your device." });
    } catch (e: any) {
      toast.error("Couldn't export PDF", { id: toastId, description: e?.message || "Try again." });
    } finally {
      setExportingPdf(false);
    }
  }

  function handleDownloadQr() {
    const svg = qrWrapRef.current?.querySelector("svg");
    if (!svg || !event) {
      toast.error("QR not ready", { description: "Try again in a moment." });
      return;
    }
    try {
      const svgStr = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      const size = 512;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(url); toast.error("Couldn't render QR"); return; }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        const safe = (event.title || "ticket").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
        a.download = `${safe}-qr.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("QR downloaded", { description: "Saved for offline check-in." });
      };
      img.onerror = () => { URL.revokeObjectURL(url); toast.error("Couldn't download QR"); };
      img.src = url;
    } catch (e: any) {
      toast.error("Couldn't download QR", { description: e?.message || "Try again." });
    }
  }
  function handleDownloadIcs() {
    if (!event) return;
    const start = new Date(event.starts_at).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const end = new Date(event.ends_at).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ""}
LOCATION:${event.location_name || "Virtual"}
END:VEVENT
END:VCALENDAR`;
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Show success state (reactive to client navigation)
  const showSuccess = searchParams.get("ticket") === "success";

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Skeleton className="aspect-video w-full rounded-xl mb-6" />
          <Skeleton className="h-8 w-2/3 mb-4" />
          <Skeleton className="h-4 w-1/3 mb-2" />
          <Skeleton className="h-20 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!event) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Event not found</div>
      </AppLayout>
    );
  }

  if (showSuccess) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-6">
            <Check className="w-10 h-10 text-primary-foreground" />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground mb-2">You're going! 🎉</h1>
          <p className="text-muted-foreground mb-6">{event.title} · {format(new Date(event.starts_at), "EEE MMM d · h:mm a")}</p>
          <div className="flex gap-3">
            <Button onClick={handleDownloadIcs} variant="outline"><CalendarDays className="w-4 h-4 mr-2" /> Add to Calendar</Button>
            {myTicket && (
              <Button onClick={() => navigate(`/tickets/${myTicket.qr_code_token}`)}><Ticket className="w-4 h-4 mr-2" /> View Ticket</Button>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEOHead
        title={`${event.title} by ${creatorProfile?.display_name || "Creator"} | UPLY`}
        description={event.description?.slice(0, 160) || `Join ${event.title} on UPLY`}
        image={event.cover_image_url || undefined}
      />
      <div className="max-w-3xl mx-auto pb-32">
        {/* Cover */}
        <div className="relative aspect-video w-full overflow-hidden">
          {event.cover_image_url ? (
            <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" loading="eager" />
          ) : (
            <div className="w-full h-full bg-card flex items-center justify-center">
              <CalendarDays className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

          {/* Creator overlay */}
          <div className="absolute bottom-4 left-4 flex items-center gap-3">
            {creatorProfile?.avatar_url && (
              <img src={creatorProfile.avatar_url} alt={creatorProfile.display_name || ""} className="w-10 h-10 rounded-full border-2 border-primary" loading="lazy" />
            )}
            <span className="text-sm font-medium text-foreground">{creatorProfile?.display_name}</span>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* Live Now Banner */}
          <EventLiveNowBanner eventId={event.id} />

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {badge && (
              <Badge variant="outline" className={badge.color}>{badge.emoji} {badge.label}</Badge>
            )}
            {event.is_free && <Badge variant="outline" className="bg-primary/20 text-primary">FREE</Badge>}
            {isPast && <Badge variant="outline" className="bg-muted text-muted-foreground">Ended</Badge>}
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">{event.title}</h1>

          {/* Date */}
          <p className="text-primary font-medium flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            {format(new Date(event.starts_at), "EEEE MMMM d · h:mm a")} {event.timezone?.split("/")[1]?.replace("_", " ")}
          </p>

          {/* Countdown */}
          {!isPast && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" /> Starts <Countdown date={event.starts_at} />
            </p>
          )}

          {/* Location */}
          {event.location_name && (
            <p className="text-muted-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4" /> {event.location_name}{event.location_city ? `, ${event.location_city}` : ""}
            </p>
          )}

          {/* Description */}
          {event.description && (
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Attendees */}
          {event.tickets_sold > 0 && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" /> {event.tickets_sold} {event.tickets_sold === 1 ? "person is" : "people are"} going
            </p>
          )}

          {/* Virtual link for ticket holders */}
          {myTicket && event.virtual_link && virtualRevealed && (
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
              <p className="text-sm font-medium text-foreground mb-2">🔗 Your access link is ready</p>
              <a href={event.virtual_link} target="_blank" rel="noopener noreferrer">
                <Button className="gap-2"><ExternalLink className="w-4 h-4" /> Join Event</Button>
              </a>
            </div>
          )}
          {myTicket && event.virtual_link && !virtualRevealed && (
            <div className="p-4 bg-card border border-border rounded-xl">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" /> Access link reveals 30 minutes before the event
              </p>
            </div>
          )}

          {/* Resale marketplace */}
          {!myTicket && (
            <ResaleListings
              eventId={event.id}
              eventTitle={event.title}
              faceValueCents={Math.round((event.ticket_price || 0) * 100)}
              resaleAllowed={(event as any).resale_allowed !== false}
              resaleCapPct={(event as any).resale_price_cap_pct ?? 120}
            />
          )}
        </div>

        {/* Multi-tier ticket picker (self-hides when the event has no tiers) */}
        {!isPast && !myTicket && <EventTierPicker eventId={event.id} eventTitle={event.title} />}

        {/* Buyer-facing ARIA concierge */}
        <EventConcierge eventId={event.id} />

        {/* Event tabs: Chat / People / Gallery / Buy-Sell */}
        <EventTabs eventId={event.id} eventTitle={event.title} />

        {/* Bottom sticky ticket card */}
        {!isPast && (
          <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-40 md:relative md:border-t-0 md:mt-6">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xl font-bold text-foreground">
                  {event.is_free ? <span className="text-primary">FREE</span> : `$${(event.ticket_price * quantity).toFixed(2)}`}
                </p>
                {event.ticket_quantity && event.ticket_quantity - event.tickets_sold <= 20 && !event.is_sold_out && (
                  <p className="text-xs text-destructive">{event.ticket_quantity - event.tickets_sold} tickets left</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!event.is_free && !myTicket && !event.is_sold_out && !isSeated && (
                  <div className="flex items-center border border-border rounded-lg overflow-hidden h-11">
                    <button aria-label="Decrease" className="w-11 h-11 flex items-center justify-center disabled:opacity-30" onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}><Minus className="w-4 h-4" /></button>
                    <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                    <button aria-label="Increase" className="w-11 h-11 flex items-center justify-center disabled:opacity-30" onClick={() => setQuantity(q => Math.min(10, q + 1))} disabled={quantity >= 10}><Plus className="w-4 h-4" /></button>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={handleDownloadIcs} aria-label="Add to calendar">
                  <CalendarDays className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => event && setReminder.mutate(event.id)} aria-label="Remind me">
                  <Bell className="w-4 h-4" />
                </Button>
                {isHost ? (
                  <Button variant="outline" onClick={() => navigate("/events")} className="gap-2">
                    <Ticket className="w-4 h-4" /> Manage Event
                  </Button>
                ) : myTicket ? (
                  <Button onClick={() => navigate(`/tickets/${myTicket.qr_code_token}`)} className="gap-2">
                    <Ticket className="w-4 h-4" /> {isFree ? "You're In ✓" : "Your Ticket"}
                  </Button>
                ) : event.is_sold_out ? (
                  <Button variant="outline" disabled>Sold Out</Button>
                ) : (
                  <Button onClick={handleGetTicket} disabled={claimFree.isPending} className="gap-2">
                    {claimFree.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                    {isFree ? "RSVP — Free" : isSeated ? "Pick Seats" : "Get Tickets"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {!event.is_free && (
          <PurchaseOverlay
            isOpen={checkoutOpen}
            onClose={() => setCheckoutOpen(false)}
            onSuccess={() => navigate(`/tickets/success?event=${event.id}`)}
            purchaseType="ticket"
            purchaseParams={{
              event_id: event.id,
              quantity: isSeated ? selectedSeats.length : quantity,
              ...(isSeated && selectedSeats.length > 0 ? { seat_labels: selectedSeats } : {}),
            }}
            title={event.title}
            description={
              isSeated && selectedSeats.length
                ? `Seats ${selectedSeats.join(", ")}`
                : `${quantity} ticket${quantity > 1 ? "s" : ""}`
            }
            price={event.ticket_price * (isSeated ? selectedSeats.length : quantity)}
          />
        )}

        {isSeated && seatMap?.rows && seatMap?.cols && (
          <SeatPicker
            isOpen={seatPickerOpen}
            onClose={() => setSeatPickerOpen(false)}
            eventId={event.id}
            rows={seatMap.rows}
            cols={seatMap.cols}
            blocked={seatMap.blocked}
            pricePerSeat={event.ticket_price}
            maxSeats={10}
            onConfirm={(seats) => {
              setSelectedSeats(seats);
              setSeatPickerOpen(false);
              setCheckoutOpen(true);
            }}
          />
        )}

        {/* Free RSVP confirmation */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-primary" /> You're In ✓
              </DialogTitle>
              <DialogDescription>
                Your free RSVP for <span className="font-medium text-foreground">{event.title}</span> is confirmed.
              </DialogDescription>
            </DialogHeader>
            {myTicket?.qr_code_token && (
              <div className="flex flex-col items-center gap-3 py-2">
                <div ref={qrWrapRef} className="bg-white p-3 rounded-xl">
                  <QRCodeSVG value={myTicket.qr_code_token} size={180} level="H" includeMargin={false} />
                </div>
                <p className="text-xs text-muted-foreground">Show this QR at check-in</p>
                {qrUpdatedAt && (
                  <p className="text-[11px] text-muted-foreground">
                    Last updated {format(qrUpdatedAt, "MMM d, h:mm a")}
                  </p>
                )}
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-col gap-2">
              {myTicket?.qr_code_token && (
                <Button onClick={() => navigate(`/tickets/${myTicket.qr_code_token}`)} className="w-full gap-2">
                  <Ticket className="w-4 h-4" /> View Full Ticket
                </Button>
              )}
              {myTicket?.qr_code_token && (
                <Button variant="secondary" onClick={handleDownloadQr} className="w-full gap-2">
                  <Download className="w-4 h-4" /> Download QR
                </Button>
              )}
              {myTicket?.qr_code_token && (
                <Button variant="secondary" onClick={() => setPrintPreviewOpen(true)} className="w-full gap-2">
                  <Printer className="w-4 h-4" /> Print Ticket
                </Button>
              )}
              {myTicket?.id && (
                <Button
                  variant="secondary"
                  onClick={handleRegenerateQr}
                  disabled={regenerating}
                  className="w-full gap-2"
                >
                  {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Regenerate QR Code
                </Button>
              )}
              <Button variant="outline" onClick={() => setConfirmOpen(false)} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Print preview */}
        <Dialog open={printPreviewOpen} onOpenChange={setPrintPreviewOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="w-5 h-5" /> Print Preview
              </DialogTitle>
              <DialogDescription>Review your ticket before printing.</DialogDescription>
            </DialogHeader>
            {myTicket?.qr_code_token && (
              <div className="rounded-xl border-2 border-dashed border-foreground/30 bg-white text-[#0A0A0A] p-5 text-center">
                <h3 className="text-base font-bold mb-1">{event.title}</h3>
                <p className="text-xs text-[#444] mb-1">
                  {format(new Date(event.starts_at), "EEE, MMM d • h:mm a")}
                </p>
                {(event.event_type === "virtual"
                  ? "Virtual"
                  : ((event as any).venue_name || (event as any).location || "")) && (
                  <p className="text-xs text-[#444] mb-2">
                    {event.event_type === "virtual"
                      ? "Virtual"
                      : ((event as any).venue_name || (event as any).location || "")}
                  </p>
                )}
                <div className="my-3 flex justify-center">
                  <QRCodeSVG value={myTicket.qr_code_token} size={160} level="H" includeMargin={false} />
                </div>
                <p className="font-mono text-xs tracking-[2px]">
                  {(myTicket.qr_code_token || "").slice(0, 8).toUpperCase()}
                </p>
                <p className="text-[10px] text-[#777] mt-2">Present this ticket at check-in. UPLY</p>
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-col gap-2">
              <Button
                disabled={printing}
                onClick={() => {
                  setPrintPreviewOpen(false);
                  setTimeout(() => handlePrintTicket(), 150);
                }}
                className="w-full gap-2"
              >
                {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                {printing ? "Preparing…" : "Print Now"}
              </Button>
              <Button variant="secondary" onClick={handleExportPdf} disabled={exportingPdf} className="w-full gap-2">
                {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {exportingPdf ? "Generating PDF…" : "Export as PDF"}
              </Button>
              {isIosOrSafari && (
                <button
                  type="button"
                  onClick={() => setIosPrintHelpOpen(true)}
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Having trouble printing on iPhone or Safari?
                </button>
              )}
              <Button variant="outline" onClick={() => setPrintPreviewOpen(false)} className="w-full">
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* iOS / Safari print fallback help */}
        <Dialog open={iosPrintHelpOpen} onOpenChange={setIosPrintHelpOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="w-5 h-5" /> Print on iPhone or Safari
              </DialogTitle>
              <DialogDescription>
                Safari may block the print pop-up. Use one of these reliable options instead.
              </DialogDescription>
            </DialogHeader>
            <ol className="space-y-3 text-sm text-foreground/90 list-decimal pl-5">
              <li>
                <span className="font-medium">Use Export as PDF</span> — saves the ticket to Files, then tap Share → Print.
              </li>
              <li>
                <span className="font-medium">Use the system Share sheet</span> — tap the Share icon in Safari and choose <em>Print</em>.
              </li>
              <li>
                <span className="font-medium">AirPrint</span> — pinch-out on the print preview thumbnail to send straight to a nearby printer.
              </li>
            </ol>
            <DialogFooter className="flex-col gap-2">
              <Button
                onClick={() => {
                  setIosPrintHelpOpen(false);
                  setTimeout(() => handleExportPdf(), 150);
                }}
                disabled={exportingPdf}
                className="w-full gap-2"
              >
                {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {exportingPdf ? "Generating PDF…" : "Export as PDF instead"}
              </Button>
              <Button variant="outline" onClick={() => setIosPrintHelpOpen(false)} className="w-full">
                Got it
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
