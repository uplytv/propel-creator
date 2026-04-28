import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, RefreshCw, QrCode as QrIcon, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  url: string;
  filenameSlug: string;
}

type ECC = "L" | "M" | "Q" | "H";

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
      </div>

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
