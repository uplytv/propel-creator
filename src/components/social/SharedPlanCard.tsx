import { useState } from "react";
import { Users, Plus, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface SharedPlanCardProps {
  eventId?: string;
  eventTitle?: string;
}

export default function SharedPlanCard({ eventId, eventTitle }: SharedPlanCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [creating, setCreating] = useState(false);

  const { data: myPlan } = useQuery({
    queryKey: ["shared-plan", eventId, user?.id],
    queryFn: async () => {
      if (!user || !eventId) return null;
      const { data } = await (supabase as any)
        .from("shared_plans")
        .select("*, shared_plan_members(*)")
        .eq("owner_id", user.id)
        .eq("event_id", eventId)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!eventId,
  });

  const { data: invitedPlans = [] } = useQuery({
    queryKey: ["invited-plans", eventId, user?.id],
    queryFn: async () => {
      if (!user || !eventId) return [];
      const { data: memberships } = await (supabase as any)
        .from("shared_plan_members")
        .select("plan_id, status")
        .eq("member_id", user.id);
      if (!memberships?.length) return [];
      const planIds = memberships.map((m: any) => m.plan_id);
      const { data: plans } = await (supabase as any)
        .from("shared_plans")
        .select("*, shared_plan_members(*)")
        .in("id", planIds)
        .eq("event_id", eventId);
      return plans || [];
    },
    enabled: !!user && !!eventId,
  });

  const createPlan = async () => {
    if (!user || !eventId) return;
    setCreating(true);
    try {
      await (supabase as any).from("shared_plans").insert({
        owner_id: user.id,
        event_id: eventId,
        title: eventTitle ? `Plan for ${eventTitle}` : "My Plan",
      });
      toast.success("Plan created! Invite friends 🎉");
      queryClient.invalidateQueries({ queryKey: ["shared-plan"] });
    } catch {
      toast.error("Failed to create plan");
    } finally {
      setCreating(false);
    }
  };

  const respondToInvite = async (planId: string, status: "accepted" | "declined") => {
    if (!user) return;
    await (supabase as any)
      .from("shared_plan_members")
      .update({ status })
      .eq("plan_id", planId)
      .eq("member_id", user.id);
    toast.success(status === "accepted" ? "Joined the plan! 🎉" : "Declined");
    queryClient.invalidateQueries({ queryKey: ["invited-plans"] });
  };

  if (!user) return null;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4" style={{ color: "#3D7CFF" }} />
        <h3 className="text-foreground font-bold text-sm">Group Plans</h3>
      </div>

      {/* My plan or create */}
      {myPlan ? (
        <div className="rounded-xl p-3 mb-2" style={{ background: "rgba(61, 124, 255,0.08)", border: "1px solid rgba(61, 124, 255,0.15)" }}>
          <p className="text-foreground font-semibold text-sm mb-1">{myPlan.title}</p>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-xs">
              {(myPlan.shared_plan_members || []).length} invited
            </span>
          </div>
        </div>
      ) : (
        <button
          onClick={createPlan}
          disabled={creating}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl mb-2 transition-transform active:scale-[0.97]"
          style={{ background: "hsl(var(--muted) / 0.5)", border: "1px dashed hsl(var(--border))" }}
        >
          {creating ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Plus className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground text-sm font-medium">Create a group plan</span>
            </>
          )}
        </button>
      )}

      {/* Invitations */}
      {invitedPlans.map((plan: any) => {
        const myMembership = (plan.shared_plan_members || []).find((m: any) => m.member_id === user.id);
        if (myMembership?.status !== "invited") return null;
        return (
          <div
            key={plan.id}
            className="rounded-xl p-3 mb-2 flex items-center justify-between"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <div>
              <p className="text-foreground text-sm font-semibold">{plan.title}</p>
              <p className="text-muted-foreground text-xs">You've been invited</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => respondToInvite(plan.id, "accepted")}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "#3D7CFF" }}
              >
                <Check className="w-4 h-4" style={{ color: "#0A0A0A" }} />
              </button>
              <button
                onClick={() => respondToInvite(plan.id, "declined")}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "hsl(var(--muted))" }}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
