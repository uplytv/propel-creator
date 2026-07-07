import { supabase } from "@/integrations/supabase/client";

/**
 * Member DMs v1 — thin data helpers over the EXISTING direct_conversations /
 * direct_messages tables (hardened by migration 20260707050000).
 * All calls use (supabase as any) until types.ts is regenerated.
 */

/** True when a PostgREST error means "the RPC isn't deployed yet". */
function isMissingFunction(error: any): boolean {
  const msg = String(error?.message ?? "");
  return error?.code === "PGRST202" || error?.code === "42883" || msg.includes("Could not find the function");
}

/**
 * Race-safe get-or-create of the 1:1 thread with another user.
 * Prefers the server-side UNIQUE-pair upsert RPC; falls back to the legacy
 * client-side select/insert pattern if the migration isn't deployed yet.
 */
export async function getOrCreateDmThread(myUserId: string, otherUserId: string): Promise<string> {
  const { data, error } = await (supabase as any).rpc("get_or_create_dm_conversation", {
    p_other_user: otherUserId,
  });
  if (!error && data) return data as string;
  if (error && !isMissingFunction(error)) throw error; // e.g. blocked pair

  // Legacy fallback (same ordering the app has always used).
  const [p1, p2] = [myUserId, otherUserId].sort();
  const { data: existing } = await (supabase as any)
    .from("direct_conversations")
    .select("id")
    .eq("participant_one", p1)
    .eq("participant_two", p2)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: created, error: insertError } = await (supabase as any)
    .from("direct_conversations")
    .insert({ participant_one: p1, participant_two: p2 })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return created.id as string;
}

/** Did I block this user? (You can only ever see your own block rows.) */
export async function fetchMyDmBlock(myUserId: string, otherUserId: string): Promise<boolean> {
  const { data } = await (supabase as any)
    .from("dm_blocks")
    .select("id")
    .eq("blocker_id", myUserId)
    .eq("blocked_id", otherUserId)
    .maybeSingle();
  return !!data;
}

export async function blockDmUser(myUserId: string, otherUserId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("dm_blocks")
    .upsert(
      { blocker_id: myUserId, blocked_id: otherUserId },
      { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true }
    );
  if (error) throw error;
}

export async function unblockDmUser(myUserId: string, otherUserId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("dm_blocks")
    .delete()
    .eq("blocker_id", myUserId)
    .eq("blocked_id", otherUserId);
  if (error) throw error;
}

export const DM_MAX_LENGTH = 2000;
