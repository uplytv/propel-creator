import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Upload, RefreshCw, QrCode as QrIcon, X, ScanLine, CheckCircle2, AlertTriangle, XCircle, Camera, CameraOff } from "lucide-react";
import jsQR from "jsqr";
import { toast } from "sonner";

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
  { name: "Electric", fg: "#00FF85", bg: "#0A0A0A" },
  { name: "Mono Dark", fg: "#FFFFFF", bg: "#0A0A0A" },
  { name: "Mono Light", fg: "#000000", bg: "#FFFFFF" },
  { name: "Magenta", fg: "#FF2D87", bg: "#0A0A0A" },
  { name: "Cyan", fg: "#00E5FF", bg: "#0A0A0A" },
  { name: "Sunset", fg: "#FF7A00", bg: "#FFFFFF" },
];

export default function BrandedQRBuilder({ url, filenameSlug }: Props) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [fg, setFg] = useState("#00FF85");
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
}

function TestScanModal({ open, onClose, canvasRef, renderQR, report }: TestScanModalProps) {
  useEffect(() => {
    if (!open) return;
    const c = canvasRef.current;
    if (!c) return;
    renderQR(c, 520).catch(() => {});
  }, [open, renderQR, canvasRef]);

  const verdictColor =
    report.verdict === "ok" ? "text-primary" : report.verdict === "warn" ? "text-yellow-400" : "text-red-400";
  const verdictLabel =
    report.verdict === "ok" ? "Looks great" : report.verdict === "warn" ? "Should scan, with caveats" : "Likely to fail";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-primary" />
            Test scan preview
          </DialogTitle>
          <DialogDescription>
            Point any phone camera at the frame below to verify the link opens correctly.
          </DialogDescription>
        </DialogHeader>

        {/* Finder frame overlay */}
        <div className="relative mx-auto w-[280px] h-[280px] rounded-2xl bg-white p-3 shadow-xl">
          <canvas ref={canvasRef} className="block w-full h-full rounded-md" />
          {/* Corner brackets */}
          <div className="pointer-events-none absolute inset-3">
            {[
              "top-0 left-0 border-t-2 border-l-2 rounded-tl-md",
              "top-0 right-0 border-t-2 border-r-2 rounded-tr-md",
              "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-md",
              "bottom-0 right-0 border-b-2 border-r-2 rounded-br-md",
            ].map((cls, i) => (
              <span
                key={i}
                className={`absolute w-7 h-7 border-primary ${cls}`}
                style={{ filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.6))" }}
              />
            ))}
            {/* Animated scan line */}
            <span
              aria-hidden
              className="absolute left-0 right-0 h-[2px] bg-primary/70"
              style={{
                top: "50%",
                boxShadow: "0 0 12px hsl(var(--primary)), 0 0 24px hsl(var(--primary) / 0.6)",
                animation: "qrScan 1.6s ease-in-out infinite alternate",
              }}
            />
          </div>
          <style>{`@keyframes qrScan { 0% { top: 8%; } 100% { top: 92%; } }`}</style>
        </div>

        {/* Verdict + score */}
        <div className="flex items-center justify-between mt-1">
          <div>
            <p className={`text-sm font-semibold ${verdictColor}`}>{verdictLabel}</p>
            <p className="text-[11px] text-muted-foreground">Reliability score</p>
          </div>
          <div className={`text-3xl font-bold ${verdictColor}`}>{report.score}</div>
        </div>

        {/* Checks */}
        <ul className="space-y-2 mt-2 max-h-[200px] overflow-y-auto pr-1">
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

        <Button onClick={onClose} variant="outline" size="sm" className="mt-1">Close</Button>
      </DialogContent>
    </Dialog>
  );
}
