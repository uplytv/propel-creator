import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAffiliateLink } from "@/hooks/useAffiliates";
import { toast } from "sonner";

/**
 * POSH-style "share to earn": logged-in users share the event with their
 * affiliate ref appended (?ref=CODE) so referred sales can be attributed;
 * everyone else shares the plain link.
 */
export default function EventShareButton({ slug }: { slug: string }) {
  const { data: affiliate } = useAffiliateLink();
  const [copied, setCopied] = useState(false);

  const url = affiliate?.code
    ? `https://uply.tv/events/${slug}?ref=${affiliate.code}`
    : `https://uply.tv/events/${slug}`;

  const onShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ url, title: "Check out this event on UPLY" });
        return;
      } catch {
        return; // user dismissed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(affiliate?.code ? "Your referral link copied — share to earn" : "Event link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={onShare} className="gap-2 shrink-0">
      {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      {affiliate?.code ? "Share & earn" : "Share"}
    </Button>
  );
}
