import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Copy, ExternalLink, Code2, Eye, Share2, Music,
  Twitter, Facebook, Send, MessageCircle, Mail,
} from "lucide-react";
import { toast } from "sonner";
import BrandedQRBuilder from "./BrandedQRBuilder";

interface ShareLink {
  id: string;
  slug: string;
  title: string;
  artist: string | null;
  cover_image_url: string | null;
  click_count: number;
  is_presave: boolean;
}

interface Props {
  links: ShareLink[];
}

export default function SmartLinkShareHub({ links }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(links[0]?.id ?? null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const selected = useMemo(
    () => links.find((l) => l.id === selectedId) ?? links[0] ?? null,
    [links, selectedId]
  );

  if (links.length === 0) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = selected ? `${origin}/link/${selected.slug}` : "";
  const previewUrl = selected ? `/link/${selected.slug}` : "";

  const embedSnippet = selected
    ? `<a href="${url}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;padding:12px 20px;background:#3D7CFF;color:#000;border-radius:999px;font-family:system-ui,sans-serif;font-weight:700;text-decoration:none;">▶ Listen to ${selected.title}</a>`
    : "";

  const iframeSnippet = selected
    ? `<iframe src="${url}?embed=1" width="100%" height="520" frameborder="0" style="border-radius:16px;max-width:420px;" allow="autoplay; encrypted-media"></iframe>`
    : "";

  // (legacy server-rendered QR removed in favor of BrandedQRBuilder)

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const shareTo = (platform: string) => {
    if (!selected) return;
    const text = encodeURIComponent(`${selected.title}${selected.artist ? ` — ${selected.artist}` : ""}`);
    const enc = encodeURIComponent(url);
    const map: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${enc}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc}`,
      whatsapp: `https://wa.me/?text=${text}%20${enc}`,
      telegram: `https://t.me/share/url?url=${enc}&text=${text}`,
      email: `mailto:?subject=${text}&body=${enc}`,
    };
    if (map[platform]) window.open(map[platform], "_blank", "noopener,noreferrer");
  };

  const nativeShare = async () => {
    if (!selected) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: selected.title, url });
      } catch {}
    } else {
      copy(url, "Link");
    }
  };

  return (
    <Card className="mb-6 overflow-hidden border-border bg-gradient-to-br from-card via-card to-primary/[0.04]">
      <div className="p-4 sm:p-5 border-b border-border/60">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Share2 className="h-4 w-4 text-primary" />
              <h2 className="text-base sm:text-lg font-bold">Share Hub</h2>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/15 text-primary">
                {links.length} link{links.length !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Copy, embed, or preview any of your public SmartLinks.
            </p>
          </div>
          {selected && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPreviewOpen(true)}
              className="min-h-[40px]"
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview fan page
            </Button>
          )}
        </div>
      </div>

      {/* Link picker */}
      <div className="p-3 sm:p-4 border-b border-border/60 overflow-x-auto">
        <div className="flex gap-2 min-w-min">
          {links.slice(0, 12).map((l) => {
            const active = l.id === selected?.id;
            return (
              <button
                key={l.id}
                onClick={() => setSelectedId(l.id)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all min-h-[44px] shrink-0 ${
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <div className="w-7 h-7 rounded-md bg-muted overflow-hidden ring-1 ring-border shrink-0">
                  {l.cover_image_url ? (
                    <img src={l.cover_image_url} alt={l.title} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="text-left min-w-0">
                  <div className="text-xs font-semibold truncate max-w-[120px]">{l.title}</div>
                  <div className="text-[10px] tabular-nums opacity-70">{l.click_count} clicks</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="p-4 sm:p-5">
          <Tabs defaultValue="link" className="w-full">
            <TabsList className="grid grid-cols-4 w-full h-auto">
              <TabsTrigger value="link" className="text-xs py-2">Link</TabsTrigger>
              <TabsTrigger value="embed" className="text-xs py-2">Embed</TabsTrigger>
              <TabsTrigger value="qr" className="text-xs py-2">QR</TabsTrigger>
              <TabsTrigger value="social" className="text-xs py-2">Social</TabsTrigger>
            </TabsList>

            {/* LINK */}
            <TabsContent value="link" className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={url}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="font-mono text-xs"
                  style={{ fontSize: "16px" }}
                />
                <Button size="sm" onClick={() => copy(url, "Link")} className="min-h-[44px]">
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={nativeShare} className="min-h-[40px]">
                  <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share
                </Button>
                <Button size="sm" variant="outline" asChild className="min-h-[40px]">
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open
                  </a>
                </Button>
              </div>
            </TabsContent>

            {/* EMBED */}
            <TabsContent value="embed" className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold flex items-center gap-1.5">
                    <Code2 className="h-3.5 w-3.5" /> Button (HTML)
                  </label>
                  <Button size="sm" variant="ghost" onClick={() => copy(embedSnippet, "Button code")} className="h-7 text-xs">
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
                <Textarea
                  readOnly
                  value={embedSnippet}
                  rows={3}
                  className="font-mono text-[11px]"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
                <div className="mt-2 p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-center">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "12px 20px", background: "#3D7CFF", color: "#000",
                      borderRadius: 999, fontWeight: 700, textDecoration: "none", fontSize: 14,
                    }}
                  >
                    ▶ Listen to {selected.title}
                  </a>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold flex items-center gap-1.5">
                    <Code2 className="h-3.5 w-3.5" /> Inline iframe
                  </label>
                  <Button size="sm" variant="ghost" onClick={() => copy(iframeSnippet, "Iframe code")} className="h-7 text-xs">
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
                <Textarea
                  readOnly
                  value={iframeSnippet}
                  rows={3}
                  className="font-mono text-[11px]"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
              </div>
            </TabsContent>

            {/* QR */}
            <TabsContent value="qr" className="mt-4">
              <BrandedQRBuilder url={url} filenameSlug={selected.slug} />
              <p className="text-[11px] text-muted-foreground mt-4 text-center">
                Print on flyers, merch, or posters. Fans scan and land directly on your SmartLink.
              </p>
            </TabsContent>

            {/* SOCIAL */}
            <TabsContent value="social" className="mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: "twitter", label: "X / Twitter", Icon: Twitter },
                  { id: "facebook", label: "Facebook", Icon: Facebook },
                  { id: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
                  { id: "telegram", label: "Telegram", Icon: Send },
                  { id: "email", label: "Email", Icon: Mail },
                ].map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => shareTo(id)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors min-h-[80px]"
                  >
                    <Icon className="h-5 w-5 text-foreground" />
                    <span className="text-[11px] font-medium">{label}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 text-center">
                Tip: Pre-saves & contests convert 3× better when shared on launch day.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Preview drawer */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-hidden">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-primary" /> Fan-facing preview
              </span>
              {selected && (
                <Button size="sm" variant="ghost" asChild className="h-8 text-xs">
                  <Link to={previewUrl} target="_blank">
                    Open full <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              )}
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="h-[calc(100vh-65px)] bg-background">
              <iframe
                src={previewUrl}
                title="SmartLink preview"
                className="w-full h-full border-0"
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
