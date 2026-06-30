import { useEffect, useRef, useState } from "react";
import {
  Link as LinkIcon,
  Check,
  Twitter,
  Facebook,
  Linkedin,
  Mail,
  MessageCircle,
  Share2,
  X,
} from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { trackBlogShare } from "@/components/BlogShareBar";
import { trackEvent } from "@/lib/posthog";

interface MobileShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  excerpt?: string;
}

/**
 * Mobile-first bottom share sheet. Renders full-width gold pill buttons stacked
 * vertically within thumb reach so the entire flow works one-handed.
 *
 * Order is intentional: native share + copy link sit at the bottom (closest to
 * the thumb), with social intents stacked above. A generous safe-area inset
 * keeps actions clear of the home indicator on iOS.
 */
export default function MobileShareSheet({
  open,
  onOpenChange,
  url,
  title,
  excerpt = "",
}: MobileShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      trackBlogShare("copy_link", { url, title, surface: "mobile_share_sheet" });
      toast({ title: "Link copied", description: "Share it anywhere." });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Long-press the URL bar to copy manually.",
        variant: "destructive",
      });
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text: excerpt, url });
        trackBlogShare("native_share", { url, title, surface: "mobile_share_sheet" });
        onOpenChange(false);
      } catch {
        /* dismissed — do not track */
      }
    } else {
      handleCopy();
    }
  };

  const enc = encodeURIComponent;
  const intents: { label: string; channel: Parameters<typeof trackBlogShare>[0]; Icon: typeof Twitter; href: string }[] = [
    {
      label: "Share on X",
      channel: "twitter",
      Icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`,
    },
    {
      label: "Share on WhatsApp",
      channel: "whatsapp",
      Icon: MessageCircle,
      href: `https://api.whatsapp.com/send?text=${enc(`${title} ${url}`)}`,
    },
    {
      label: "Share on Facebook",
      channel: "facebook",
      Icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    },
    {
      label: "Share on LinkedIn",
      channel: "linkedin",
      Icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
    },
    {
      label: "Share by email",
      channel: "email",
      Icon: Mail,
      href: `mailto:?subject=${enc(title)}&body=${enc(`${excerpt}\n\n${url}`)}`,
    },
  ];

  const hasNativeShare =
    typeof navigator !== "undefined" && typeof (navigator as any).share === "function";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="border-t border-gold/30 bg-[#0A0A0A] text-foreground focus:outline-none"
        aria-describedby={undefined}
      >
        <DrawerHeader className="relative px-5 pb-2 pt-3 text-left">
          <DrawerTitle className="font-fraunces text-xl tracking-tight text-foreground">
            Share this story
          </DrawerTitle>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{title}</p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close share sheet"
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/60 text-foreground/80 active:scale-[0.97]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </DrawerHeader>

        <div
          className="flex flex-col gap-2.5 px-5 pt-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
        >
          {/* Social intents — stacked, far from thumb so primary actions stay last */}
          {intents.map(({ label, channel, Icon, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackBlogShare(channel, { url, title, surface: "mobile_share_sheet" })}
              className="group inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-gold/40 bg-card/40 px-5 text-sm font-semibold text-foreground transition-colors active:scale-[0.99] active:bg-gold/10 hover:border-gold hover:text-gold"
            >
              <Icon className="h-4 w-4 text-gold/90 group-hover:text-gold" aria-hidden />
              <span>{label}</span>
            </a>
          ))}

          {/* Copy link — secondary primary action */}
          <button
            type="button"
            onClick={handleCopy}
            aria-live="polite"
            className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-gold/60 bg-card/40 px-5 text-sm font-semibold text-foreground transition-colors active:scale-[0.99] active:bg-gold/15 hover:border-gold hover:text-gold"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-gold" aria-hidden />
                Link copied
              </>
            ) : (
              <>
                <LinkIcon className="h-4 w-4 text-gold" aria-hidden />
                Copy link
              </>
            )}
          </button>

          {/* Primary: native share — sits closest to the thumb */}
          {hasNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-gold px-5 text-sm font-bold text-[#0A0A0A] shadow-[0_8px_24px_-12px_rgba(212,175,55,0.7)] transition-transform active:scale-[0.99]"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              Share via…
            </button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
