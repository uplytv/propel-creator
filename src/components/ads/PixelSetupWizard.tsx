import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronRight, ExternalLink, Loader2, ShieldCheck, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

export type AdPlatform = "meta" | "tiktok" | "google" | "snapchat";

const META: Record<AdPlatform, {
  label: string;
  color: string;
  pixelLabel: string;
  pixelHint: string;
  pixelPlaceholder: string;
  tokenLabel: string;
  tokenHint: string;
  needsToken: boolean;
  helpUrl: string;
}> = {
  meta: {
    label: "Meta (Facebook & Instagram)",
    color: "#1877F2",
    pixelLabel: "Pixel ID",
    pixelHint: "15–16 digit number from Events Manager → Data Sources",
    pixelPlaceholder: "1234567890123456",
    tokenLabel: "Conversions API access token",
    tokenHint: "Events Manager → Settings → Generate Access Token",
    needsToken: true,
    helpUrl: "https://www.facebook.com/business/help/952192354843755",
  },
  tiktok: {
    label: "TikTok Ads",
    color: "#FF0050",
    pixelLabel: "Pixel Code",
    pixelHint: "TikTok Ads Manager → Assets → Events → Web Events",
    pixelPlaceholder: "C12ABCDE34FGHIJ56",
    tokenLabel: "Events API access token (optional)",
    tokenHint: "Required for server-side conversion events",
    needsToken: false,
    helpUrl: "https://ads.tiktok.com/help/article/get-started-pixel",
  },
  google: {
    label: "Google Ads",
    color: "#FBBC04",
    pixelLabel: "Conversion ID",
    pixelHint: "Starts with AW- (Google Ads), G- (GA4), or GTM- (Tag Manager)",
    pixelPlaceholder: "AW-1234567890",
    tokenLabel: "Conversion label (optional)",
    tokenHint: "From your Google Ads conversion action",
    needsToken: false,
    helpUrl: "https://support.google.com/google-ads/answer/6095821",
  },
  snapchat: {
    label: "Snapchat Ads",
    color: "#FFFC00",
    pixelLabel: "Snap Pixel ID",
    pixelHint: "Snapchat Ads Manager → Events Manager",
    pixelPlaceholder: "abc12345-de67-...",
    tokenLabel: "Conversions API token (optional)",
    tokenHint: "Required for server-side events",
    needsToken: false,
    helpUrl: "https://businesshelp.snapchat.com/s/article/snap-pixel-about",
  },
};

interface Props {
  platform: AdPlatform | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}

type Step = 1 | 2 | 3 | 4;

export default function PixelSetupWizard({ platform, open, onOpenChange, onSaved }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [pixelId, setPixelId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [testCode, setTestCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ ready: boolean; message: string } | null>(null);

  const meta = platform ? META[platform] : null;

  // Load existing values when opened
  useEffect(() => {
    if (!open || !platform || !user) return;
    setStep(1);
    setVerifyResult(null);
    (async () => {
      const { data } = await supabase
        .from("ad_integrations")
        .select("pixel_id, has_access_token, test_event_code")
        .eq("user_id", user.id)
        .eq("platform", platform)
        .maybeSingle();
      setPixelId(data?.pixel_id || "");
      // Saved token is write-only; leave blank to keep it.
      setAccessToken("");
      setTestCode(data?.test_event_code || "");
    })();
  }, [open, platform, user]);

  if (!meta || !platform) return null;

  const saveAndAdvance = async (next: Step) => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("ad_integrations")
        .upsert(
          {
            user_id: user.id,
            platform,
            pixel_id: pixelId.trim(),
            ...(accessToken.trim() ? { access_token: accessToken.trim() } : {}),
            test_event_code: testCode.trim() || null,
            is_active: false,
          },
          { onConflict: "user_id,platform" }
        );
      if (error) throw error;
      setStep(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const runVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ads-verify-pixel", {
        body: { platform },
      });
      if (error) throw error;
      const res = data as { ready: boolean; message: string };
      setVerifyResult(res);
      if (res.ready) {
        toast.success("Pixel ready", { description: res.message });
        onSaved();
      }
    } catch (e) {
      setVerifyResult({
        ready: false,
        message: e instanceof Error ? e.message : "Verify failed",
      });
    } finally {
      setVerifying(false);
    }
  };

  const Stepper = () => (
    <div className="flex items-center gap-1.5 mb-4">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="flex items-center gap-1.5 flex-1">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
              step >= n
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {step > n ? <Check className="w-3.5 h-3.5" /> : n}
          </div>
          {n < 4 && (
            <div className={`h-0.5 flex-1 rounded-full ${step > n ? "bg-primary" : "bg-muted"}`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold"
              style={{ background: `${meta.color}22`, color: meta.color }}
            >
              {meta.label[0]}
            </div>
            <span>Connect {meta.label}</span>
            <Badge variant="outline" className="text-[10px]">Step {step} of 4</Badge>
          </DialogTitle>
        </DialogHeader>

        <Stepper />

        {/* STEP 1: Intro */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We'll connect your <b className="text-foreground">{meta.label}</b> pixel so every
              SmartLink click, presave, and conversion fires automatically — both client-side and
              server-side (CAPI).
            </p>
            <ol className="text-xs text-muted-foreground space-y-2 bg-muted/40 rounded-lg p-3">
              <li className="flex gap-2"><span className="font-bold text-primary">1.</span> Grab your {meta.pixelLabel}</li>
              {meta.needsToken && (
                <li className="flex gap-2"><span className="font-bold text-primary">2.</span> Generate a Conversions API access token</li>
              )}
              <li className="flex gap-2"><span className="font-bold text-primary">{meta.needsToken ? 3 : 2}.</span> Paste them in</li>
              <li className="flex gap-2"><span className="font-bold text-primary">{meta.needsToken ? 4 : 3}.</span> Verify with a test event</li>
            </ol>
            <a
              href={meta.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
            >
              Where do I find these? <ExternalLink className="w-3 h-3" />
            </a>
            <Button onClick={() => setStep(2)} className="w-full min-h-[44px]">
              Get started <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* STEP 2: Pixel ID */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">{meta.pixelLabel}</Label>
              <Input
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                placeholder={meta.pixelPlaceholder}
                style={{ fontSize: "16px" }}
                className="mt-1.5 font-mono"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">{meta.pixelHint}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="min-h-[44px]">Back</Button>
              <Button
                onClick={() => saveAndAdvance(3)}
                disabled={!pixelId.trim() || saving}
                className="flex-1 min-h-[44px]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Token */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">
                {meta.tokenLabel}
                {!meta.needsToken && <span className="text-muted-foreground font-normal"> (optional)</span>}
              </Label>
              <Input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="EAA••••••••••••"
                style={{ fontSize: "16px" }}
                className="mt-1.5 font-mono"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">{meta.tokenHint}</p>
            </div>
            {platform === "meta" && (
              <div>
                <Label className="text-sm font-semibold">
                  Test event code <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  value={testCode}
                  onChange={(e) => setTestCode(e.target.value)}
                  placeholder="TEST12345"
                  style={{ fontSize: "16px" }}
                  className="mt-1.5 font-mono"
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  From Events Manager → Test Events. Lets you see verification fire in real time.
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="min-h-[44px]">Back</Button>
              <Button
                onClick={() => saveAndAdvance(4)}
                disabled={(meta.needsToken && !accessToken.trim()) || saving}
                className="flex-1 min-h-[44px]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save & verify <ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Verify */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Ready to verify
              </p>
              <p className="text-xs text-muted-foreground">
                {platform === "meta"
                  ? "We'll send a test event to Meta's Conversions API and confirm your token works."
                  : "We'll validate your pixel format and arm conversion tracking. Real events fire on the next SmartLink click."}
              </p>
            </div>

            {verifyResult && (
              <div
                className={`rounded-xl border p-3 flex gap-3 ${
                  verifyResult.ready
                    ? "border-primary/30 bg-primary/5"
                    : "border-amber-500/30 bg-amber-500/5"
                }`}
              >
                {verifyResult.ready ? (
                  <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    {verifyResult.ready ? "Pixel is ready" : "Not verified yet"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 break-words">
                    {verifyResult.message}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)} className="min-h-[44px]">Back</Button>
              {!verifyResult?.ready ? (
                <Button onClick={runVerify} disabled={verifying} className="flex-1 min-h-[44px]">
                  {verifying ? (
                    <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Verifying…</>
                  ) : (
                    <><ShieldCheck className="w-4 h-4 mr-1.5" /> Run verification</>
                  )}
                </Button>
              ) : (
                <Button onClick={() => onOpenChange(false)} className="flex-1 min-h-[44px]">
                  <Check className="w-4 h-4 mr-1.5" /> Done
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
