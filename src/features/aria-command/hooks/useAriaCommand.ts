import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AriaAction {
  id: string;
  creator_id: string;
  intent: string;
  parsed_params: Record<string, unknown>;
  summary: string | null;
  requires_approval: boolean;
  status: "pending" | "approved" | "executed" | "failed" | "cancelled";
  result: any;
  error: string | null;
  created_at: string;
  executed_at: string | null;
}

export function useAriaCommand() {
  const [actions, setActions] = useState<AriaAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("aria_actions" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setActions((data ?? []) as any);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const submit = useCallback(async (message: string) => {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase.functions.invoke("aria-intent-parser", {
        body: { message },
      });
      if (e) throw e;
      if (data?.error) throw new Error(data.error);
      const action = data.action as AriaAction;

      // READ intents auto-execute
      if (!action.requires_approval) {
        await execute(action.id);
      } else {
        await refresh();
      }
      return action;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const execute = useCallback(async (actionId: string) => {
    setLoading(true);
    try {
      const { data, error: e } = await supabase.functions.invoke("aria-intent-executor", {
        body: { action_id: actionId },
      });
      if (e) throw e;
      if (data?.error) throw new Error(data.error);
      await refresh();
      return data.action as AriaAction;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const approve = useCallback(async (actionId: string) => {
    await supabase
      .from("aria_actions" as any)
      .update({ status: "approved" })
      .eq("id", actionId);
    return execute(actionId);
  }, [execute]);

  const cancel = useCallback(async (actionId: string) => {
    await supabase
      .from("aria_actions" as any)
      .update({ status: "cancelled" })
      .eq("id", actionId);
    await refresh();
  }, [refresh]);

  return { actions, loading, error, submit, approve, cancel, refresh };
}
