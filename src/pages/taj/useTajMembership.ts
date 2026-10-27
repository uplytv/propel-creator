import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { MEMBERSHIP, TAJ_HANDLES } from "./content";

const LOCAL_KEY = "taj-club-member-id";

export type TajLiveTier = {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly?: number | null;
  stripe_price_id: string | null;
};

/**
 * Join Taj Club through the same auth + community membership path the rest of
 * UPLY uses. If a live creator profile (username tajfencing / taj) and active
 * subscription tiers exist, Join opens real tier checkout. Otherwise Join
 * still creates or uses a UPLY member account and records club membership —
 * the $1,500 figure stays a quoted label, not a fabricated Stripe charge.
 */
export function useTajMembership() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [tiers, setTiers] = useState<TajLiveTier[]>([]);
  const [joining, setJoining] = useState(false);
  const [member, setMember] = useState(false);
  const [showTiers, setShowTiers] = useState(false);

  useEffect(() => {
    if (!user) {
      setMember(false);
      return;
    }
    const meta = Boolean((user.user_metadata as { taj_club_member?: boolean } | undefined)?.taj_club_member);
    const local = typeof localStorage !== "undefined" && localStorage.getItem(LOCAL_KEY) === user.id;
    if (meta || local) setMember(true);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const handle of TAJ_HANDLES) {
        const { data, error } = await supabase
          .rpc("get_public_profile_by_username", { _username: handle })
          .maybeSingle();
        if (error || !data?.user_id) continue;
        if (cancelled) return;
        setCreatorId(data.user_id);
        const { data: tierRows } = await supabase
          .from("subscription_tiers")
          .select("id,name,description,price_monthly,price_yearly,stripe_price_id")
          .eq("creator_id", data.user_id)
          .eq("is_active", true)
          .order("price_monthly", { ascending: true });
        if (!cancelled && tierRows?.length) setTiers(tierRows as TajLiveTier[]);
        if (user) {
          const { data: row } = await supabase
            .from("community_members")
            .select("id")
            .eq("creator_id", data.user_id)
            .eq("user_id", user.id)
            .maybeSingle();
          if (!cancelled && row) setMember(true);
        }
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const confirmMembership = useCallback(async (explicitUser?: User | null) => {
    let active = explicitUser ?? user;
    if (!active) {
      const { data } = await supabase.auth.getSession();
      active = data.session?.user ?? null;
    }
    if (!active) {
      navigate("/taj/join#membership");
      return;
    }
    if (tiers.length > 0 && creatorId) {
      setShowTiers(true);
      return;
    }
    setJoining(true);
    try {
      if (creatorId) {
        const { error } = await supabase.from("community_members").upsert(
          { user_id: active.id, creator_id: creatorId },
          { onConflict: "user_id,creator_id" },
        );
        if (error) {
          toast.message("Membership saved on this account", {
            description: "The club space is not open for self-join yet. Your Taj Club place is recorded here.",
          });
        }
      }
      localStorage.setItem(LOCAL_KEY, active.id);
      await supabase.auth.updateUser({
        data: { taj_club_member: true, signup_source: "taj-fencing" },
      });
      await supabase.from("profiles").update({ account_type: "member" }).eq("user_id", active.id);
      setMember(true);
      toast.success("You're in Taj Club", { description: MEMBERSHIP.display });
      navigate("/taj/classroom");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't finish joining";
      toast.error(message);
    } finally {
      setJoining(false);
    }
  }, [user, tiers.length, creatorId, navigate]);

  return {
    user,
    creatorId,
    tiers,
    joining,
    member,
    showTiers,
    setShowTiers,
    confirmMembership,
  };
}
