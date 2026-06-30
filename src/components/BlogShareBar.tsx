import { useEffect, useRef, useState } from "react";
import { Link as LinkIcon, Check, Twitter, Facebook, Linkedin, Mail, MessageCircle, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MobileShareSheet from "@/components/MobileShareSheet";
import { trackEvent } from "@/lib/posthog";
import { trackEvent } from "@/lib/posthog";

type ShareChannel =
  | "copy_link"
  | "native_share"
  | "twitter"
  | "facebook"
  | "linkedin"
  | "whatsapp"
  | "email";

/**
 * Single source of truth for share analytics. Every share surface
 * (top bar, bottom bar, mobile sheet) emits `blog_post_shared`
 * with the same shape so funnels stay clean.
 */
export function trackBlogShare(
  channel: ShareChannel,
  meta: { url: string; title: string; surface: "blog_share_bar" | "mobile_share_sheet" },
) {
  trackEvent("blog_post_shared", {
    channel,
    surface: meta.surface,
    url: meta.url,
    title: meta.title,
  });
}

interface Props {
  /** Absolute URL of the post. Falls back to current location at click time. */
  url?: string;
  title: string;
  excerpt?: string;
}

/**
 * Social share row used at the top and bottom of every UPLY blog post.
 * Includes a copy-link button (with success state + toast) plus native
 * share intent links for X/Twitter, Facebook, LinkedIn, WhatsApp, and email.
 * Falls back to the Web Share API on mobile via the "Share" button.
 */
export default function BlogShareBar({ url, title, excerpt = "" }: Props) {
  const [copied, setCopied] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();

  const resolveUrl = () =>
    url ?? (typeof window !== "undefined" ? window.location.href : "");

  const handleCopy = async () => {
    const link = resolveUrl();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      trackBlogShare("copy_link", { url: link, title, surface: "blog_share_bar" });
      toast({ title: "Link copied", description: "Share it anywhere." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Long-press the URL bar to copy manually.",
        variant: "destructive",
      });
    }
  };

  const openShareSheet = () => setSheetOpen(true);

  const link = resolveUrl();
  const enc = encodeURIComponent;
  const intents: { label: string; channel: ShareChannel; Icon: typeof Twitter; href: string }[] = [
    {
      label: "Share on X",
      channel: "twitter",
      Icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${enc(link)}&text=${enc(title)}`,
    },
    {
      label: "Share on Facebook",
      channel: "facebook",
      Icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`,
    },
    {
      label: "Share on LinkedIn",
      channel: "linkedin",
      Icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(link)}`,
    },
    {
      label: "Share on WhatsApp",
      channel: "whatsapp",
      Icon: MessageCircle,
      href: `https://api.whatsapp.com/send?text=${enc(`${title} ${link}`)}`,
    },
    {
      label: "Share by email",
      channel: "email",
      Icon: Mail,
      href: `mailto:?subject=${enc(title)}&body=${enc(`${excerpt}\n\n${link}`)}`,
    },
  ];

  return (
    <div
      role="group"
      aria-label="Share this post"
      className="flex flex-wrap items-center gap-2"
    >
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Link copied" : "Copy link"}
        aria-live="polite"
        className="hover-gold inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-xs font-semibold text-foreground"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-gold" />
            Copied
          </>
        ) : (
          <>
            <LinkIcon className="h-3.5 w-3.5" />
            Copy link
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          trackBlogShare("native_share", { url: link, title, surface: "blog_share_bar" });
          openShareSheet();
        }}
        aria-label="Open share sheet"
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
        className="inline-flex md:hidden items-center gap-2 rounded-full bg-gold px-3.5 py-1.5 text-xs font-bold text-[#0A0A0A] shadow-[0_4px_16px_-8px_rgba(212,175,55,0.7)] active:scale-[0.98]"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </button>

      <div className="hidden md:flex items-center gap-1.5">
        {intents.map(({ label, channel, Icon, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            onClick={() => trackBlogShare(channel, { url: link, title, surface: "blog_share_bar" })}
            className="hover-gold inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/60 text-foreground/80"
          >
            <Icon className="h-4 w-4" aria-hidden />
          </a>
        ))}
      </div>

      <MobileShareSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        url={link}
        title={title}
        excerpt={excerpt}
      />
    </div>
  );
}
