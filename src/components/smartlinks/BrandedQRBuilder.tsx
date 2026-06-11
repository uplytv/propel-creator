import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Upload, RefreshCw, QrCode as QrIcon, X, ScanLine, CheckCircle2, AlertTriangle, XCircle, Camera, CameraOff, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, Crosshair } from "lucide-react";
import jsQR from "jsqr";
import { toast } from "sonner";
import { hapticTick } from "@/lib/cameraHaptics";

// --- Reliability scoring ---
type ECC = "L" | "M" | "Q" | "H";
type Severity = "ok" | "warn" | "fail";
interface ReliabilityCheck { id: string; label: string; severity: Severity; detail: string; }
interface ReliabilityReport { score: number; checks: ReliabilityCheck[]; verdict: Severity; }

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function relLuminance([r, g, b]: [number, number, number]) {
  const f = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrastRatio(a: string, b: string) {
  const la = relLuminance(hexToRgb(a)), lb = relLuminance(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function evaluateReliability(opts: {
  fg: string; bg: string; margin: number; ecc: ECC; hasLogo: boolean; logoScale: number;
}): ReliabilityReport {
  const checks: ReliabilityCheck[] = [];
  // ECC vs logo
  const eccCap: Record<ECC, number> = { L: 7, M: 15, Q: 25, H: 30 };
  const logoArea = opts.hasLogo ? (opts.logoScale * opts.logoScale) / 100 : 0; // % of QR area
  if (opts.hasLogo) {
    if (opts.ecc !== "H" && opts.ecc !== "Q") {
      checks.push({ id: "ecc", label: "Error correction", severity: "fail", detail: `Logo present but ECC is ${opts.ecc}. Use High (30%) for reliable scans.` });
    } else if (opts.ecc === "Q" && logoArea > 18) {
      checks.push({ id: "ecc", label: "Error correction", severity: "warn", detail: "Logo area exceeds Quartile recovery. Switch to High." });
    } else {
      checks.push({ id: "ecc", label: "Error correction", severity: "ok", detail: `ECC ${opts.ecc} (${eccCap[opts.ecc]}% recovery) covers your logo.` });
    }
  } else {
    checks.push({ id: "ecc", label: "Error correction", severity: "ok", detail: `ECC ${opts.ecc} — fine without a logo.` });
  }
  // Logo size
  if (opts.hasLogo) {
    if (opts.logoScale > 28) checks.push({ id: "logo", label: "Logo size", severity: "fail", detail: `${opts.logoScale}% is too large — keep below 25% to stay scannable.` });
    else if (opts.logoScale > 25) checks.push({ id: "logo", label: "Logo size", severity: "warn", detail: `${opts.logoScale}% is close to the limit. 18–22% is the safe zone.` });
    else checks.push({ id: "logo", label: "Logo size", severity: "ok", detail: `${opts.logoScale}% sits in the safe zone.` });
  }
  // Quiet zone
  if (opts.margin < 2) checks.push({ id: "margin", label: "Quiet zone", severity: "fail", detail: `Margin ${opts.margin} is too tight. Use at least 2 modules.` });
  else if (opts.margin < 3) checks.push({ id: "margin", label: "Quiet zone", severity: "warn", detail: "A margin of 4 is the spec recommendation." });
  else checks.push({ id: "margin", label: "Quiet zone", severity: "ok", detail: `Margin ${opts.margin} gives scanners breathing room.` });
  // Contrast
  const cr = contrastRatio(opts.fg, opts.bg);
  if (cr < 3) checks.push({ id: "contrast", label: "Contrast", severity: "fail", detail: `Ratio ${cr.toFixed(1)}:1 — too low. Aim for 7:1+.` });
  else if (cr < 7) checks.push({ id: "contrast", label: "Contrast", severity: "warn", detail: `Ratio ${cr.toFixed(1)}:1 — okay, but darker FG / lighter BG scans faster.` });
  else checks.push({ id: "contrast", label: "Contrast", severity: "ok", detail: `Ratio ${cr.toFixed(1)}:1 — excellent.` });
  // Inverted
  const fgL = relLuminance(hexToRgb(opts.fg)), bgL = relLuminance(hexToRgb(opts.bg));
  if (fgL > bgL) checks.push({ id: "invert", label: "Polarity", severity: "warn", detail: "Light modules on dark background — some older scanners struggle." });

  const fails = checks.filter((c) => c.severity === "fail").length;
  const warns = checks.filter((c) => c.severity === "warn").length;
  const score = Math.max(0, 100 - fails * 35 - warns * 12);
  const verdict: Severity = fails > 0 ? "fail" : warns > 0 ? "warn" : "ok";
  return { score, checks, verdict };
}

interface Props {
  url: string;
  filenameSlug: string;
}


const PRESET_COLORS = [
  { name: "Electric", fg: "#3D7CFF", bg: "#0A0A0A" },
  { name: "Mono Dark", fg: "#FFFFFF", bg: "#0A0A0A" },
  { name: "Mono Light", fg: "#000000", bg: "#FFFFFF" },
  { name: "Magenta", fg: "#FF2D87", bg: "#0A0A0A" },
  { name: "Cyan", fg: "#00E5FF", bg: "#0A0A0A" },
  { name: "Sunset", fg: "#FF7A00", bg: "#FFFFFF" },
];

export default function BrandedQRBuilder({ url, filenameSlug }: Props) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [fg, setFg] = useState("#3D7CFF");
  const [bg, setBg] = useState("#0A0A0A");
  const [margin, setMargin] = useState(2);
  const [ecc, setEcc] = useState<ECC>("H");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoScale, setLogoScale] = useState(22); // % of QR width
  const [exportSize, setExportSize] = useState(1024);
  const [busy, setBusy] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const scanCanvasRef = useRef<HTMLCanvasElement>(null);

  const reliability = useMemo(
    () => evaluateReliability({ fg, bg, margin, ecc, hasLogo: !!logoDataUrl, logoScale }),
    [fg, bg, margin, ecc, logoDataUrl, logoScale],
  );

  // Render QR (with optional logo) into a canvas at given pixel size
  const renderQR = useCallback(
    async (canvas: HTMLCanvasElement, size: number) => {
      if (!url) return;
      await QRCode.toCanvas(canvas, url, {
        errorCorrectionLevel: ecc,
        margin,
        width: size,
        color: { dark: fg, light: bg },
      });
      if (logoDataUrl) {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Logo failed to load"));
          img.src = logoDataUrl;
        });
        const logoPx = Math.round((logoScale / 100) * size);
        const x = Math.round((size - logoPx) / 2);
        const y = Math.round((size - logoPx) / 2);
        const pad = Math.max(6, Math.round(logoPx * 0.08));
        // White rounded backplate for legibility
        const r = Math.round(logoPx * 0.18);
        ctx.fillStyle = bg === "#FFFFFF" ? "#FFFFFF" : "#FFFFFF";
        roundRect(ctx, x - pad, y - pad, logoPx + pad * 2, logoPx + pad * 2, r);
        ctx.fill();
        // Clip logo to rounded square
        ctx.save();
        roundRect(ctx, x, y, logoPx, logoPx, Math.round(logoPx * 0.14));
        ctx.clip();
        ctx.drawImage(img, x, y, logoPx, logoPx);
        ctx.restore();
      }
    },
    [url, fg, bg, margin, ecc, logoDataUrl, logoScale],
  );

  // Live preview
  useEffect(() => {
    const c = previewRef.current;
    if (!c) return;
    renderQR(c, 360).catch(() => {});
  }, [renderQR]);

  const onLogoFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const downloadPNG = async () => {
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      await renderQR(canvas, exportSize);
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Could not generate PNG");
          return;
        }
        const a = document.createElement("a");
        const objUrl = URL.createObjectURL(blob);
        a.href = objUrl;
        a.download = `qr-${filenameSlug}-${exportSize}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objUrl);
        toast.success(`Downloaded ${exportSize}×${exportSize} PNG`);
      }, "image/png");
    } catch (e) {
      toast.error("Failed to render QR");
    } finally {
      setBusy(false);
    }
  };

  const presetButtons = useMemo(
    () => PRESET_COLORS.map((p) => (
      <button
        key={p.name}
        onClick={() => { setFg(p.fg); setBg(p.bg); }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border hover:border-primary/50 transition-colors min-h-[36px]"
        title={p.name}
      >
        <span className="w-4 h-4 rounded-full ring-1 ring-border" style={{ background: p.bg }}>
          <span className="block w-2 h-2 m-1 rounded-sm" style={{ background: p.fg }} />
        </span>
        <span className="text-[11px] font-medium">{p.name}</span>
      </button>
    )),
    [],
  );

  return (
    <div className="grid md:grid-cols-[auto,1fr] gap-5">
      {/* Preview */}
      <div className="flex flex-col items-center gap-3">
        <div className="p-3 rounded-2xl bg-white shadow-lg">
          <canvas ref={previewRef} className="block w-[220px] h-[220px] rounded-md" />
        </div>
        <div className="flex items-center gap-2 w-full">
          <Select value={String(exportSize)} onValueChange={(v) => setExportSize(parseInt(v))}>
            <SelectTrigger className="h-9 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="512">512 × 512 (web)</SelectItem>
              <SelectItem value="1024">1024 × 1024 (social)</SelectItem>
              <SelectItem value="2048">2048 × 2048 (print)</SelectItem>
              <SelectItem value="4096">4096 × 4096 (poster)</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={downloadPNG} disabled={busy} className="min-h-[40px]">
            {busy ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
            PNG
          </Button>
        </div>
        <button
          type="button"
          onClick={() => setScanOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:border-primary/50 transition-colors text-xs font-medium min-h-[36px]"
        >
          <ScanLine className="h-3.5 w-3.5" />
          Test scan
          <span
            className={`ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
              reliability.verdict === "ok"
                ? "bg-primary/15 text-primary"
                : reliability.verdict === "warn"
                ? "bg-yellow-500/15 text-yellow-400"
                : "bg-red-500/15 text-red-400"
            }`}
          >
            {reliability.score}
          </span>
        </button>
      </div>

      <TestScanModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        canvasRef={scanCanvasRef}
        renderQR={renderQR}
        report={reliability}
        expectedUrl={url}
      />

      {/* Controls */}
      <div className="space-y-4">
        {/* Presets */}
        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">Color presets</Label>
          <div className="flex flex-wrap gap-1.5">{presetButtons}</div>
        </div>

        {/* Custom colors */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1 block">Foreground</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={fg}
                onChange={(e) => setFg(e.target.value)}
                className="h-9 w-12 rounded-md border border-border bg-transparent cursor-pointer"
              />
              <Input
                value={fg}
                onChange={(e) => setFg(e.target.value)}
                className="font-mono text-xs h-9"
                style={{ fontSize: "16px" }}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Background</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                className="h-9 w-12 rounded-md border border-border bg-transparent cursor-pointer"
              />
              <Input
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                className="font-mono text-xs h-9"
                style={{ fontSize: "16px" }}
              />
            </div>
          </div>
        </div>

        {/* Margin & ECC */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-2 flex justify-between">
              <span>Quiet zone</span>
              <span className="text-muted-foreground">{margin}</span>
            </Label>
            <Slider
              value={[margin]}
              onValueChange={(v) => setMargin(v[0])}
              min={0}
              max={6}
              step={1}
            />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Error correction</Label>
            <Select value={ecc} onValueChange={(v) => setEcc(v as ECC)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="L">Low (7%)</SelectItem>
                <SelectItem value="M">Medium (15%)</SelectItem>
                <SelectItem value="Q">Quartile (25%)</SelectItem>
                <SelectItem value="H">High (30%) — recommended for logos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Logo */}
        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
            Center logo (optional)
          </Label>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-primary/50 cursor-pointer min-h-[40px] text-xs font-medium">
              <Upload className="h-3.5 w-3.5" />
              {logoDataUrl ? "Replace logo" : "Upload logo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onLogoFile(e.target.files[0])}
              />
            </label>
            {logoDataUrl && (
              <>
                <div className="w-9 h-9 rounded-md overflow-hidden ring-1 ring-border bg-white flex items-center justify-center">
                  <img src={logoDataUrl} alt="logo" className="w-full h-full object-contain" />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLogoDataUrl(null)}
                  className="h-9 text-xs"
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Remove
                </Button>
              </>
            )}
          </div>
          {logoDataUrl && (
            <div className="mt-3">
              <Label className="text-xs mb-2 flex justify-between">
                <span>Logo size</span>
                <span className="text-muted-foreground">{logoScale}%</span>
              </Label>
              <Slider
                value={[logoScale]}
                onValueChange={(v) => setLogoScale(v[0])}
                min={10}
                max={32}
                step={1}
              />
              <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                <QrIcon className="h-3 w-3" />
                Tip: keep error correction on <strong>High</strong> when adding a logo so QR stays scannable.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function SeverityIcon({ s }: { s: Severity }) {
  if (s === "ok") return <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />;
  if (s === "warn") return <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />;
  return <XCircle className="h-4 w-4 text-red-400 shrink-0" />;
}

interface TestScanModalProps {
  open: boolean;
  onClose: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  renderQR: (canvas: HTMLCanvasElement, size: number) => Promise<void>;
  report: ReliabilityReport;
  expectedUrl: string;
}

type ScanStatus = "idle" | "starting" | "scanning" | "matched" | "mismatch" | "error";

function normalizeUrl(u: string) {
  try {
    const x = new URL(u);
    return (x.origin + x.pathname.replace(/\/$/, "") + x.search).toLowerCase();
  } catch {
    return u.trim().toLowerCase();
  }
}

function TestScanModal({ open, onClose, canvasRef, renderQR, report, expectedUrl }: TestScanModalProps) {
  const [mode, setMode] = useState<"preview" | "camera">("preview");
  const videoRef = useRef<HTMLVideoElement>(null);
  const decodeCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<any>(null);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [decoded, setDecoded] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  // Alignment guidance: position of QR within the camera frame (normalized 0-1) and size ratio
  const [align, setAlign] = useState<{
    cx: number; cy: number; size: number; tilt: number; found: boolean;
  } | null>(null);
  const frameCounterRef = useRef(0);
  // Smoothing state for alignment overlay (avoids jitter from partial detection / camera shake)
  const smoothRef = useRef<{ cx: number; cy: number; size: number; tilt: number } | null>(null);
  const missCountRef = useRef(0);
  // Calibration: brief auto-center phase before continuous arrows
  const [calibrating, setCalibrating] = useState(false);
  const calibStartRef = useRef<number>(0);
  const calibSamplesRef = useRef(0);
  // After calibration completes, keep the tracker box + stability label visible briefly
  // so the directional arrows feel grounded in a confirmed lock rather than appearing cold.
  const LOCK_HOLD_MS = 2500;
  const [lockedHoldUntil, setLockedHoldUntil] = useState<number>(0);
  const [nowTs, setNowTs] = useState<number>(0);
  const lockedHolding = lockedHoldUntil > 0 && nowTs < lockedHoldUntil;
  // Subtle confirmation feedback when calibration locks in.
  const [lockFeedback, setLockFeedback] = useState<boolean>(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playLockChime = useCallback(() => {
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      // Two quick ascending notes — gentle, "trustworthy lock" feel
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.09);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch { /* noop */ }
  }, []);
  const fireLockFeedback = useCallback(() => {
    if (!lockFeedback) return;
    void hapticTick();
    playLockChime();
  }, [lockFeedback, playLockChime]);
  useEffect(() => {
    if (lockedHoldUntil <= 0) return;
    const remaining = lockedHoldUntil - performance.now();
    if (remaining <= 0) { setLockedHoldUntil(0); return; }
    const tick = () => setNowTs(performance.now());
    tick();
    const id = window.setInterval(tick, 120);
    const end = window.setTimeout(() => { setLockedHoldUntil(0); }, remaining + 50);
    return () => { window.clearInterval(id); window.clearTimeout(end); };
  }, [lockedHoldUntil]);
  // User-tunable stability requirement before calibration completes.
  // Higher = arrows start from a more reliably centered position, but takes longer to lock.
  type CalibStability = "fast" | "balanced" | "strict";
  const [calibStability, setCalibStability] = useState<CalibStability>("balanced");
  const CALIB_PRESETS: Record<CalibStability, { minMs: number; minSamples: number; maxMs: number; label: string; hint: string }> = {
    fast:     { minMs: 500,  minSamples: 4,  maxMs: 1500, label: "Fast",     hint: "~0.5s lock" },
    balanced: { minMs: 800,  minSamples: 6,  maxMs: 2000, label: "Balanced", hint: "~0.8s lock" },
    strict:   { minMs: 1400, minSamples: 12, maxMs: 3500, label: "Strict",   hint: "~1.4s lock" },
  };
  const calibCfgRef = useRef(CALIB_PRESETS.balanced);
  useEffect(() => { calibCfgRef.current = CALIB_PRESETS[calibStability]; }, [calibStability]);

  // Render QR into preview canvas when modal opens / preview tab active
  useEffect(() => {
    if (!open || mode !== "preview") return;
    const c = canvasRef.current;
    if (!c) return;
    renderQR(c, 520).catch(() => {});
  }, [open, mode, renderQR, canvasRef]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Cleanup camera when modal closes or switching tabs
  useEffect(() => {
    if (!open || mode !== "camera") {
      stopCamera();
      if (!open) {
        setStatus("idle");
        setDecoded(null);
        setErrorMsg(null);
        setLatencyMs(null);
        setAlign(null);
        setCalibrating(false);
        setLockedHoldUntil(0);
        setMode("preview");
      }
    }
    return () => stopCamera();
  }, [open, mode, stopCamera]);

  // Start camera when entering camera mode
  useEffect(() => {
    if (!open || mode !== "camera") return;
    let cancelled = false;
    setStatus("starting");
    setDecoded(null);
    setErrorMsg(null);
    setLatencyMs(null);
    setAlign(null);
    smoothRef.current = null;
    missCountRef.current = 0;
    calibSamplesRef.current = 0;
    setCalibrating(false);
    setLockedHoldUntil(0);

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        v.setAttribute("playsinline", "true");
        await v.play();

        // Prefer native BarcodeDetector when available
        const BD = (window as any).BarcodeDetector;
        if (BD && typeof BD === "function") {
          try {
            detectorRef.current = new BD({ formats: ["qr_code"] });
          } catch {
            detectorRef.current = null;
          }
        } else {
          detectorRef.current = null;
        }

        setStatus("scanning");
        // Begin calibration: brief guided phase to lock onto a starting position
        setCalibrating(true);
        calibStartRef.current = performance.now();
        calibSamplesRef.current = 0;
        const startedAt = performance.now();
        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          const video = videoRef.current;
          if (video.readyState < 2) {
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
          let value: string | null = null;
          let location: any = null;
          let frameW = video.videoWidth;
          let frameH = video.videoHeight;
          try {
            if (detectorRef.current) {
              const codes = await detectorRef.current.detect(video);
              if (codes && codes.length > 0) {
                value = codes[0].rawValue ?? null;
                const bb = codes[0].boundingBox;
                if (bb) {
                  location = {
                    topLeftCorner: { x: bb.x, y: bb.y },
                    topRightCorner: { x: bb.x + bb.width, y: bb.y },
                    bottomLeftCorner: { x: bb.x, y: bb.y + bb.height },
                    bottomRightCorner: { x: bb.x + bb.width, y: bb.y + bb.height },
                  };
                }
              }
            }
            // Always run a (downscaled) jsQR pass for alignment hints, even when BarcodeDetector found nothing
            if (!location || !value) {
              frameCounterRef.current++;
              // Throttle alignment scan to every 2nd frame to keep perf
              if (frameCounterRef.current % 2 === 0 && frameW && frameH) {
                const dc = decodeCanvasRef.current!;
                const targetW = 360;
                const scale = Math.min(1, targetW / frameW);
                const w = Math.max(1, Math.round(frameW * scale));
                const h = Math.max(1, Math.round(frameH * scale));
                dc.width = w;
                dc.height = h;
                const ctx = dc.getContext("2d", { willReadFrequently: true });
                if (ctx) {
                  ctx.drawImage(video, 0, 0, w, h);
                  const img = ctx.getImageData(0, 0, w, h);
                  const code = jsQR(img.data, w, h, { inversionAttempts: "attemptBoth" });
                  if (code) {
                    if (!value) value = code.data;
                    if (!location) {
                      // Scale coords back to full video frame
                      const inv = 1 / scale;
                      const loc = code.location;
                      location = {
                        topLeftCorner: { x: loc.topLeftCorner.x * inv, y: loc.topLeftCorner.y * inv },
                        topRightCorner: { x: loc.topRightCorner.x * inv, y: loc.topRightCorner.y * inv },
                        bottomLeftCorner: { x: loc.bottomLeftCorner.x * inv, y: loc.bottomLeftCorner.y * inv },
                        bottomRightCorner: { x: loc.bottomRightCorner.x * inv, y: loc.bottomRightCorner.y * inv },
                      };
                    }
                  }
                }
              }
            }
          } catch {
            // ignore frame errors
          }

          // Compute alignment guidance for the overlay (with EMA smoothing + miss tolerance)
          if (location && frameW && frameH) {
            const tl = location.topLeftCorner, tr = location.topRightCorner;
            const bl = location.bottomLeftCorner, br = location.bottomRightCorner;
            const rawCx = ((tl.x + tr.x + bl.x + br.x) / 4) / frameW;
            const rawCy = ((tl.y + tr.y + bl.y + br.y) / 4) / frameH;
            const widthPx = Math.hypot(tr.x - tl.x, tr.y - tl.y);
            const heightPx = Math.hypot(bl.x - tl.x, bl.y - tl.y);
            const rawSize = Math.max(widthPx / frameW, heightPx / frameH);
            const rawTiltDeg = Math.atan2(tr.y - tl.y, tr.x - tl.x) * (180 / Math.PI);

            missCountRef.current = 0;
            const prev = smoothRef.current;
            // Low-pass filter: heavier smoothing for position/tilt, lighter for size
            const aPos = 0.25; // position smoothing factor
            const aSize = 0.2;
            const aTilt = 0.18;
            // Tilt is angular — wrap to nearest neighbour to avoid 179°→-179° flips
            let tiltTarget = rawTiltDeg;
            if (prev) {
              let delta = tiltTarget - prev.tilt;
              if (delta > 180) delta -= 360;
              else if (delta < -180) delta += 360;
              tiltTarget = prev.tilt + delta;
            }
            const next = prev
              ? {
                  cx: prev.cx + (rawCx - prev.cx) * aPos,
                  cy: prev.cy + (rawCy - prev.cy) * aPos,
                  size: prev.size + (rawSize - prev.size) * aSize,
                  tilt: prev.tilt + (tiltTarget - prev.tilt) * aTilt,
                }
              : { cx: rawCx, cy: rawCy, size: rawSize, tilt: rawTiltDeg };
            smoothRef.current = next;

            // Track calibration progress: count consecutive in-frame samples
            calibSamplesRef.current += 1;
            const elapsed = performance.now() - calibStartRef.current;
            // End calibration when stability requirement is met (configurable preset)
            const cfg = calibCfgRef.current;
            if (
              (elapsed > cfg.minMs && calibSamplesRef.current >= cfg.minSamples) ||
              elapsed > cfg.maxMs
            ) {
              setCalibrating((c) => {
                if (c) {
                  // Trigger the post-lock hold window so tracker box + label stay visible
                  setLockedHoldUntil(performance.now() + LOCK_HOLD_MS);
                  // Subtle confirmation feedback (haptic + soft chime) on lock-in
                  fireLockFeedback();
                  return false;
                }
                return c;
              });
            }

            // Only commit to React state when change is meaningful (reduces re-renders / micro-jitter)
            setAlign((cur) => {
              if (
                cur &&
                cur.found &&
                Math.abs(cur.cx - next.cx) < 0.004 &&
                Math.abs(cur.cy - next.cy) < 0.004 &&
                Math.abs(cur.size - next.size) < 0.005 &&
                Math.abs(cur.tilt - next.tilt) < 0.6
              ) {
                return cur;
              }
              return { ...next, found: true };
            });
          } else {
            // Tolerate a few missed frames before flagging "not found" so brief occlusions don't flicker the UI
            missCountRef.current += 1;
            if (missCountRef.current > 8) {
              smoothRef.current = null;
              // Restart calibration sample count so we re-lock once QR is back in view
              calibSamplesRef.current = 0;
              // End the locked-hold window — we lost tracking, so don't pretend we're locked
              setLockedHoldUntil((v) => (v ? 0 : v));
              setAlign((prev) => (prev && prev.found ? { ...prev, found: false } : prev));
            }
          }

          if (value) {
            setDecoded(value);
            setLatencyMs(Math.round(performance.now() - startedAt));
            const ok = normalizeUrl(value) === normalizeUrl(expectedUrl);
            setStatus(ok ? "matched" : "mismatch");
            try { (navigator as any).vibrate?.(ok ? [40, 20, 40] : 120); } catch {}
            stopCamera();
            return;
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e: any) {
        if (cancelled) return;
        const msg =
          e?.name === "NotAllowedError"
            ? "Camera permission denied. Allow camera access in your browser settings."
            : e?.name === "NotFoundError"
            ? "No camera found on this device."
            : e?.message || "Could not access camera.";
        setErrorMsg(msg);
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, mode, expectedUrl, stopCamera]);

  const verdictColor =
    report.verdict === "ok" ? "text-primary" : report.verdict === "warn" ? "text-yellow-400" : "text-red-400";
  const verdictLabel =
    report.verdict === "ok" ? "Looks great" : report.verdict === "warn" ? "Should scan, with caveats" : "Likely to fail";

  const rescan = () => {
    setStatus("idle");
    setDecoded(null);
    setErrorMsg(null);
    setLatencyMs(null);
    // Re-trigger camera effect by toggling mode
    setMode("preview");
    setTimeout(() => setMode("camera"), 50);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-primary" />
            Test scan
          </DialogTitle>
          <DialogDescription>
            Preview the QR or use your device camera to confirm it scans to the right link.
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-muted/40 border border-border/50">
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium min-h-[36px] transition-colors ${
              mode === "preview" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <QrIcon className="h-3.5 w-3.5" /> Preview
          </button>
          <button
            type="button"
            onClick={() => setMode("camera")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium min-h-[36px] transition-colors ${
              mode === "camera" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Camera className="h-3.5 w-3.5" /> Camera
          </button>
        </div>

        {/* Calibration stability selector (camera mode only) */}
        {mode === "camera" && (
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Crosshair className="h-3 w-3" />
              <span>Lock-in stability</span>
            </div>
            <div className="grid grid-cols-3 gap-1 p-0.5 rounded-md bg-muted/40 border border-border/50">
              {(Object.keys(CALIB_PRESETS) as CalibStability[]).map((k) => {
                const p = CALIB_PRESETS[k];
                const active = calibStability === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setCalibStability(k);
                      // If we're mid-calibration, restart so the new threshold applies cleanly
                      if (calibrating) {
                        calibStartRef.current = performance.now();
                        calibSamplesRef.current = 0;
                      }
                    }}
                    title={p.hint}
                    className={`px-2 py-1 rounded text-[11px] font-medium min-h-[28px] transition-colors ${
                      active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Lock-in feedback toggle (camera mode only) */}
        {mode === "camera" && (
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" />
              <span>Lock-in feedback</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setLockFeedback((v) => {
                  const next = !v;
                  // Preview the feedback when enabling so the user knows what to expect
                  if (next) {
                    void hapticTick();
                    playLockChime();
                  }
                  return next;
                });
              }}
              className={`px-2 py-1 rounded text-[11px] font-medium min-h-[28px] transition-colors border ${
                lockFeedback
                  ? "bg-primary/15 text-primary border-primary/40"
                  : "bg-muted/40 text-muted-foreground border-border/50 hover:text-foreground"
              }`}
              aria-pressed={lockFeedback}
            >
              {lockFeedback ? "On · Tap + chime" : "Off"}
            </button>
          </div>
        )}

        {/* Frame area */}
        <div className="relative mx-auto w-[280px] h-[280px] rounded-2xl bg-black p-3 shadow-xl overflow-hidden">
          {mode === "preview" ? (
            <div className="w-full h-full bg-white rounded-md p-1">
              <canvas ref={canvasRef} className="block w-full h-full rounded-md" />
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                muted
                playsInline
                className="w-full h-full object-cover rounded-md"
              />
              <canvas ref={decodeCanvasRef} className="hidden" />
              {status === "starting" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white text-xs">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Starting camera…
                </div>
              )}
              {status === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-center px-4">
                  <CameraOff className="h-6 w-6 text-red-400" />
                  <p className="text-[11px] text-white/90">{errorMsg}</p>
                </div>
              )}
              {status === "matched" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-primary/20 backdrop-blur-sm">
                  <div className="bg-primary text-primary-foreground rounded-full p-3 shadow-lg">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <p className="text-xs font-semibold text-primary">Scan successful</p>
                </div>
              )}
              {status === "mismatch" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-yellow-500/20 backdrop-blur-sm text-center px-4">
                  <AlertTriangle className="h-7 w-7 text-yellow-400" />
                  <p className="text-xs font-semibold text-yellow-200">Decoded a different URL</p>
                </div>
              )}

              {/* Alignment guidance overlay */}
              {status === "scanning" && (() => {
                const TARGET_MIN = 0.45;
                const TARGET_MAX = 0.78;
                const CENTER_TOL = 0.12;

                if (!align) {
                  return (
                    <>
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-center pointer-events-none">
                        <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5 text-[11px] font-medium text-white/90 border border-white/10">
                          <Crosshair className="h-3.5 w-3.5 text-primary animate-pulse" />
                          {calibrating ? "Calibrating — show me the QR" : "Point at your QR code"}
                        </div>
                      </div>
                      {calibrating && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div
                            className="rounded-2xl border-2 border-primary/70"
                            style={{
                              width: "62%",
                              aspectRatio: "1 / 1",
                              boxShadow: "0 0 0 9999px rgba(0,0,0,0.35), 0 0 24px hsl(var(--primary) / 0.5)",
                              animation: "qrCalibPulse 1.2s ease-in-out infinite",
                            }}
                          />
                        </div>
                      )}
                    </>
                  );
                }

                if (!align.found) {
                  return (
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-center pointer-events-none">
                      <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5 text-[11px] font-medium text-yellow-200 border border-yellow-500/30">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Lost — recenter the QR
                      </div>
                    </div>
                  );
                }

                const dx = align.cx - 0.5;
                const dy = align.cy - 0.5;
                const offCenter = Math.hypot(dx, dy) > CENTER_TOL;
                const tooSmall = align.size < TARGET_MIN;
                const tooLarge = align.size > TARGET_MAX;
                const tilted = Math.abs(align.tilt) > 12;
                const aligned = !offCenter && !tooSmall && !tooLarge;

                // Position a tracker box around the detected QR
                const boxLeft = `${Math.max(2, Math.min(98, (align.cx - align.size / 2) * 100))}%`;
                const boxTop = `${Math.max(2, Math.min(98, (align.cy - align.size / 2) * 100))}%`;
                const boxSize = `${Math.max(8, Math.min(96, align.size * 100))}%`;

                return (
                  <>
                    {/* Tracker box around detected QR */}
                    <div
                      className={`absolute pointer-events-none rounded-md border-2 transition-all duration-150 ${
                        aligned || lockedHolding ? "border-primary" : "border-yellow-300/90"
                      }`}
                      style={{
                        left: boxLeft,
                        top: boxTop,
                        width: boxSize,
                        height: boxSize,
                        boxShadow: aligned || lockedHolding
                          ? "0 0 18px hsl(var(--primary) / 0.8)"
                          : "0 0 10px rgba(250,204,21,0.45)",
                      }}
                    />

                    {/* Top guidance pill */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-center pointer-events-none">
                      <div
                        className={`flex items-center gap-1.5 backdrop-blur-sm rounded-full px-3 py-1.5 text-[11px] font-semibold border ${
                          calibrating
                            ? "bg-black/70 text-white border-primary/40"
                            : lockedHolding
                            ? "bg-primary/25 text-primary border-primary/50"
                            : aligned
                            ? "bg-primary/20 text-primary border-primary/40"
                            : "bg-black/70 text-white border-white/10"
                        }`}
                      >
                        {calibrating ? (
                          <>
                            <Crosshair className="h-3.5 w-3.5 text-primary animate-pulse" />
                            Calibrating — hold steady
                          </>
                        ) : lockedHolding ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Locked · {CALIB_PRESETS[calibStability].label}
                          </>
                        ) : aligned ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Hold steady — decoding…
                          </>
                        ) : tooSmall ? (
                          <>
                            <ZoomIn className="h-3.5 w-3.5 text-primary" />
                            Move closer
                          </>
                        ) : tooLarge ? (
                          <>
                            <ZoomOut className="h-3.5 w-3.5 text-primary" />
                            Move back
                          </>
                        ) : tilted ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 text-primary" />
                            Straighten the QR
                          </>
                        ) : (
                          <>
                            <Crosshair className="h-3.5 w-3.5 text-primary" />
                            Center inside the frame
                          </>
                        )}
                      </div>
                    </div>

                    {/* Directional arrows when off-center (suppressed during calibration) */}
                    {!calibrating && !aligned && offCenter && (
                      <div className="pointer-events-none absolute inset-3">
                        {dy < -CENTER_TOL && (
                          <ArrowUp className="absolute top-1 left-1/2 -translate-x-1/2 h-5 w-5 text-primary drop-shadow-[0_0_4px_hsl(var(--primary))] animate-bounce" />
                        )}
                        {dy > CENTER_TOL && (
                          <ArrowDown className="absolute bottom-1 left-1/2 -translate-x-1/2 h-5 w-5 text-primary drop-shadow-[0_0_4px_hsl(var(--primary))] animate-bounce" />
                        )}
                        {dx < -CENTER_TOL && (
                          <ArrowLeft className="absolute left-1 top-1/2 -translate-y-1/2 h-5 w-5 text-primary drop-shadow-[0_0_4px_hsl(var(--primary))] animate-bounce" />
                        )}
                        {dx > CENTER_TOL && (
                          <ArrowRight className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 text-primary drop-shadow-[0_0_4px_hsl(var(--primary))] animate-bounce" />
                        )}
                      </div>
                    )}

                    {/* Distance / size meter at the bottom */}
                    <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
                      <div className="bg-black/70 backdrop-blur-sm rounded-md border border-white/10 px-2 py-1.5">
                        <div className="flex items-center justify-between text-[10px] text-white/70 mb-1">
                          <span className="flex items-center gap-1"><ZoomOut className="h-3 w-3" /> back</span>
                          <span>{Math.round(align.size * 100)}%</span>
                          <span className="flex items-center gap-1">closer <ZoomIn className="h-3 w-3" /></span>
                        </div>
                        <div className="relative h-1.5 rounded-full bg-white/15 overflow-hidden">
                          {/* Target band */}
                          <div
                            className="absolute top-0 bottom-0 bg-primary/25"
                            style={{ left: `${TARGET_MIN * 100}%`, width: `${(TARGET_MAX - TARGET_MIN) * 100}%` }}
                          />
                          {/* Current marker */}
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full border-2 ${
                              aligned ? "bg-primary border-primary" : "bg-yellow-300 border-yellow-200"
                            }`}
                            style={{ left: `${Math.max(0, Math.min(100, align.size * 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </>
          )}

          {/* Corner brackets always visible as a finder frame */}
          <div className="pointer-events-none absolute inset-3">
            {[
              "top-0 left-0 border-t-2 border-l-2 rounded-tl-md",
              "top-0 right-0 border-t-2 border-r-2 rounded-tr-md",
              "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-md",
              "bottom-0 right-0 border-b-2 border-r-2 rounded-br-md",
            ].map((cls, i) => (
              <span
                key={i}
                className={`absolute w-7 h-7 ${
                  status === "matched" ? "border-primary" : status === "mismatch" || status === "error" ? "border-red-400" : "border-primary"
                } ${cls}`}
                style={{ filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.6))" }}
              />
            ))}
            {(mode === "preview" || status === "scanning") && (
              <span
                aria-hidden
                className="absolute left-0 right-0 h-[2px] bg-primary/70"
                style={{
                  top: "50%",
                  boxShadow: "0 0 12px hsl(var(--primary)), 0 0 24px hsl(var(--primary) / 0.6)",
                  animation: "qrScan 1.6s ease-in-out infinite alternate",
                }}
              />
            )}
          </div>
          <style>{`@keyframes qrScan { 0% { top: 8%; } 100% { top: 92%; } } @keyframes qrCalibPulse { 0%, 100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.06); opacity: 1; } }`}</style>
        </div>

        {/* Camera result panel */}
        {mode === "camera" && (status === "matched" || status === "mismatch") && (
          <div
            className={`p-3 rounded-lg border text-xs space-y-1 ${
              status === "matched" ? "bg-primary/10 border-primary/40" : "bg-yellow-500/10 border-yellow-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {status === "matched" ? "Matches your SmartLink" : "Different URL detected"}
              </span>
              {latencyMs != null && (
                <span className="text-[10px] text-muted-foreground">{(latencyMs / 1000).toFixed(1)}s</span>
              )}
            </div>
            <p className="font-mono text-[10px] break-all text-muted-foreground">{decoded}</p>
            <Button size="sm" variant="outline" onClick={rescan} className="mt-2 h-8 text-xs">
              <RefreshCw className="h-3 w-3 mr-1.5" /> Scan again
            </Button>
          </div>
        )}

        {/* Verdict + score (preview only) */}
        {mode === "preview" && (
          <>
            <div className="flex items-center justify-between mt-1">
              <div>
                <p className={`text-sm font-semibold ${verdictColor}`}>{verdictLabel}</p>
                <p className="text-[11px] text-muted-foreground">Reliability score</p>
              </div>
              <div className={`text-3xl font-bold ${verdictColor}`}>{report.score}</div>
            </div>

            <ul className="space-y-2 mt-2 max-h-[180px] overflow-y-auto pr-1">
              {report.checks.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/50"
                >
                  <SeverityIcon s={c.severity} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-tight">{c.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{c.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        <Button onClick={onClose} variant="outline" size="sm" className="mt-1">Close</Button>
      </DialogContent>
    </Dialog>
  );
}
