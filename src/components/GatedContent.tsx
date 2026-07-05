import { ReactNode, useState } from "react";
import { useAccess } from "@/hooks/useAccess";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Lock, LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { memberAuthUrl } from "@/lib/memberAuth";
import PaywallModal from "@/components/PaywallModal";
import { Skeleton } from "@/components/ui/skeleton";

interface GatedContentProps {
  resourceType: string;
  resourceId: string;
  price: number;
  billingType?: "one_time" | "recurring";
  title: string;
  description?: string;
  thumbnailUrl?: string | null;
  source?: string;
  streamId?: string | null;
  creatorId?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

function AccessSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}

function SignInPrompt() {
  const navigate = useNavigate();
  const returnTo = window.location.pathname + window.location.search;

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none opacity-30 min-h-[120px]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg p-6">
        <LogIn className="w-8 h-8 text-muted-foreground mb-3" />
        <p className="text-sm font-semibold text-foreground mb-2">Create your free account</p>
        <Button
          size="sm"
          onClick={() => navigate(memberAuthUrl(returnTo))}
          className="gap-1.5"
        >
          <LogIn className="w-3.5 h-3.5" /> Sign Up Free
        </Button>
      </div>
    </div>
  );
}

function FreeJoinCTA({
  resourceType,
  resourceId,
  title,
  source,
  onGranted,
}: {
  resourceType: string;
  resourceId: string;
  title: string;
  source: string;
  onGranted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleFreeJoin = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("grant-free-access", {
        body: {
          resource_type: resourceType,
          resource_id: resourceId,
          source,
        },
      });
      if (error) throw error;
      onGranted();
    } catch {
      // Fallback: direct insert for backwards compat
      try {
        await supabase.from("product_purchases").insert({
          product_id: resourceId,
          buyer_id: user.id,
          creator_id: "",
          amount: 0,
          status: "completed",
        });
        onGranted();
      } catch {
        // silent
      }
    }
    setLoading(false);
  };

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none opacity-30 min-h-[120px]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg p-6">
        <p className="text-sm font-semibold text-foreground mb-2">Join for free</p>
        <Button
          size="sm"
          onClick={handleFreeJoin}
          disabled={loading}
          variant="outline"
          className="gap-1.5 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Join Free →"}
        </Button>
      </div>
    </div>
  );
}

export default function GatedContent({
  resourceType,
  resourceId,
  price,
  billingType = "one_time",
  title,
  description,
  thumbnailUrl,
  source = "profile_page",
  streamId,
  creatorId,
  fallback,
  children,
}: GatedContentProps) {
  const { user } = useAuth();
  const { hasAccess, isLoading, refetch } = useAccess(resourceType, resourceId);
  const [showPaywall, setShowPaywall] = useState(false);

  // 1. Loading
  if (isLoading) return <AccessSkeleton />;

  // 2. Has access
  if (hasAccess) return <>{children}</>;

  // 3. Not logged in
  if (!user) return <SignInPrompt />;

  // 4. Free content
  if (price === 0) {
    return (
      <FreeJoinCTA
        resourceType={resourceType}
        resourceId={resourceId}
        title={title}
        source={source}
        onGranted={() => refetch()}
      />
    );
  }

  // 5. Paid — show fallback with paywall trigger
  return (
    <>
      <div className="relative">
        {fallback || (
          <div className="blur-sm pointer-events-none select-none opacity-30 min-h-[120px]" />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg p-6">
          <Lock className="w-8 h-8 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground mb-2">Premium content</p>
          <Button
            size="sm"
            onClick={() => setShowPaywall(true)}
            className="gap-1.5"
          >
            {billingType === "recurring"
              ? `Subscribe · $${price}/mo`
              : `Buy Now · $${price}`}
          </Button>
        </div>
      </div>
      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        resourceType={resourceType}
        resourceId={resourceId}
        price={price}
        billingType={billingType}
        title={title}
        description={description}
        thumbnailUrl={thumbnailUrl}
        source={source}
        streamId={streamId}
        creatorId={creatorId}
        onSuccess={() => refetch()}
      />
    </>
  );
}
