import { useEffect, useState } from "react";
import { Crown, Loader2, Palette, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// "H S% L%"  <->  #RRGGBB helpers (CSS tokens here are HSL triples)
function hexToHslTriple(hex: string): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslTripleToHex(triple: string | null, fallback: string): string {
  if (!triple) return fallback;
  const parts = triple.trim().split(/\s+/);
  if (parts.length < 3) return fallback;
  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export default function BrandingSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryHsl, setPrimaryHsl] = useState("219 100% 62%");
  const [accentHsl, setAccentHsl] = useState("280 85% 60%");
  const [supportEmail, setSupportEmail] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("whitelabel_config")
        .select("*")
        .eq("creator_id", user.id)
        .maybeSingle();
      if (data) {
        setEnabled(!!data.enabled);
        setBrandName(data.brand_name ?? "");
        setLogoUrl(data.logo_url ?? "");
        setPrimaryHsl(data.primary_hsl ?? "219 100% 62%");
        setAccentHsl(data.accent_hsl ?? "280 85% 60%");
        setSupportEmail(data.support_email ?? "");
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("whitelabel_config").upsert(
        {
          creator_id: user.id,
          enabled,
          brand_name: brandName.trim() || null,
          logo_url: logoUrl.trim() || null,
          primary_hsl: primaryHsl,
          accent_hsl: accentHsl,
          support_email: supportEmail.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "creator_id" }
      );
      if (error) throw error;
      toast.success(enabled ? "Branding saved & live on your surfaces" : "Branding saved");
    } catch (err: any) {
      toast.error(err?.message || "Couldn't save branding");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-40 rounded-xl bg-muted/30 animate-pulse" />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" /> Branding (White-Label)
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Apply your own logo, name and color across your community, profile and events — your audience sees your brand, not UPLY.
          </p>
        </div>
      </div>

      {/* Plan note */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3">
        <p className="text-xs text-foreground flex items-center gap-2">
          <Crown className="w-4 h-4 text-primary shrink-0" />
          Branding goes live on the <span className="font-semibold">White-Label plan</span> ($497/mo). Configure it now — it activates when you toggle it on.
        </p>
        <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={() => navigate("/upgrade")}>
          Upgrade <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border p-3">
        <div>
          <p className="text-sm font-medium text-foreground">Enable white-label branding</p>
          <p className="text-xs text-muted-foreground">When on, your brand replaces UPLY on your member-facing surfaces.</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Brand name</Label>
          <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Your brand" maxLength={40} />
        </div>
        <div className="space-y-1.5">
          <Label>Support email</Label>
          <Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@yourbrand.com" type="email" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Logo URL</Label>
          <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://yourbrand.com/logo.png" />
          <p className="text-[11px] text-muted-foreground">A transparent PNG/SVG, ideally ~40px tall.</p>
        </div>
        <div className="space-y-1.5">
          <Label>Primary color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={hslTripleToHex(primaryHsl, "#3D7CFF")}
              onChange={(e) => setPrimaryHsl(hexToHslTriple(e.target.value))}
              className="h-9 w-12 rounded-md border border-border bg-transparent cursor-pointer"
              aria-label="Primary color"
            />
            <span className="text-xs text-muted-foreground font-mono">{hslTripleToHex(primaryHsl, "#3D7CFF")}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Accent color (gradient end)</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={hslTripleToHex(accentHsl, "#B025FF")}
              onChange={(e) => setAccentHsl(hexToHslTriple(e.target.value))}
              className="h-9 w-12 rounded-md border border-border bg-transparent cursor-pointer"
              aria-label="Accent color"
            />
            <span className="text-xs text-muted-foreground font-mono">{hslTripleToHex(accentHsl, "#B025FF")}</span>
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="rounded-xl border border-border p-4" style={{ ["--primary" as any]: primaryHsl }}>
        <p className="text-xs text-muted-foreground mb-2">Preview</p>
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName || "Brand"} className="h-7 w-auto object-contain" />
          ) : (
            <span className="font-bold text-foreground">{brandName || "Your Brand"}</span>
          )}
          <Button size="sm" className="ml-auto">Primary button</Button>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Save branding
      </Button>
    </div>
  );
}
