import { useState } from "react";
import { Copy, Check, DollarSign, MousePointerClick, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemberAffiliateCode } from "@/hooks/useAffiliates";

interface MemberEarnTabProps {
  programId: string;
  creatorId: string;
}

export function MemberEarnTab({ programId, creatorId }: MemberEarnTabProps) {
  const [copied, setCopied] = useState(false);
  const { data: codeData, isLoading } = useMemberAffiliateCode(programId);

  const affiliateLink = codeData?.code
    ? `${window.location.origin}/community/${creatorId}?ref=${codeData.code}`
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <div>
        <h3 className="font-semibold mb-1">Earn with Referrals</h3>
        <p className="text-xs text-muted-foreground">Share your unique link and earn commission on every new subscriber you refer.</p>
      </div>

      {/* Link */}
      <div className="glass-card p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your Affiliate Link</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-xs font-mono text-muted-foreground truncate">
            {affiliateLink}
          </div>
          <Button variant="default" size="sm" onClick={handleCopy} className="flex-shrink-0 gap-1">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1"
            onClick={() => {
              const text = encodeURIComponent("Check out this creator community! 🚀");
              const url = encodeURIComponent(affiliateLink);
              window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, "_blank");
            }}
          >
            <ExternalLink className="w-3 h-3" /> Share on X
          </Button>
        </div>
      </div>

      {/* Stats placeholder - actual data comes from creator_affiliate_members */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4 text-center">
          <MousePointerClick className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-lg font-bold font-mono">0</p>
          <p className="text-xs text-muted-foreground">Clicks</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Users className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-lg font-bold font-mono">0</p>
          <p className="text-xs text-muted-foreground">Conversions</p>
        </div>
        <div className="glass-card p-4 text-center">
          <DollarSign className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-lg font-bold font-mono">$0</p>
          <p className="text-xs text-muted-foreground">Earnings</p>
        </div>
      </div>
    </div>
  );
}
