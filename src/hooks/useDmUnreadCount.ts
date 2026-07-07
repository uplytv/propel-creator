import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * Total unread DMs addressed to the signed-in user, live-updated.
 * RLS already scopes direct_messages to conversations I participate in, so
 * "read=false AND sender != me" is exactly "unread messages addressed to me".
 *
 * AppLayout badge usage (one line):
 *   const dmUnread = useDmUnreadCount();  // render a dot/count on the Messages nav item when > 0
 */
export function useDmUnreadCount(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!user) {
      setCount(0);
      return;
    }
    const { count: unread, error } = await (supabase as any)
      .from("direct_messages")
      .select("id", { count: "exact", head: true })
      .eq("read", false)
      .neq("sender_id", user.id);
    if (!error) setCount(unread ?? 0);
  }, [user]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dm-unread-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, () => fetchCount())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages" }, () => fetchCount())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchCount]);

  return count;
}
