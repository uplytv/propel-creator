import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface MemberReferralWidgetProps {
  creatorId: string;
  creatorName: string;
}

export default function MemberReferralWidget({ creatorId, creatorName }: MemberReferralWidgetProps) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check if program is active
  const { data: program } = useQuery({
    queryKey: ["member-referral-program", creatorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("member_referral_programs")
        .select("*")
        .eq("creator_id", creatorId)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
  });

  // Get or generate code
  const { data: codeData } = useQuery({
    queryKey: ["member-referral-code", creatorId, user?.id],
    enabled: expanded && !!user?.id && !!program,
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("generate-member-referral-code", {
        body: { member_id: user!.id, creator_id: creatorId },
      });
      return data;
    },
  });

  if (!program || !user) return null;

  const referralLink = codeData?.code ? `${window.location.origin}/join/${codeData.code}` : "";
  const tweetText = `I'm a member of ${creatorName}'s community on @uplyTV — use my link to join and we both get rewarded: ${referralLink}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join ${creatorName} on UPLY`, text: tweetText, url: referralLink });
      } catch {}
    } else {
      await navigator.clipboard.writeText(`${tweetText}`);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="border-primary/20 bg-card">
      <CardContent className="p-4">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center justify-between w-full text-left">
          <span className="text-sm font-semibold">🎁 Earn rewards — invite friends</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {expanded && (
          <div className="mt-4 space-y-3">
            {program.reward_description && (
              <p className="text-xs text-muted-foreground">{program.reward_description}</p>
            )}

            {referralLink && (
              <>
                <div className="flex gap-2">
                  <Input value={referralLink} readOnly className="text-xs h-9" />
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(referralLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>

                {codeData && (
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{codeData.clicks ?? 0} clicks</span>
                    <span>·</span>
                    <span>{codeData.conversions ?? 0} joined</span>
                  </div>
                )}

                <Button size="sm" className="w-full" onClick={handleShare}>
                  <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share & Earn
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
