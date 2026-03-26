import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface AriaAgent {
  id: string;
  creator_id: string;
  agent_type: string;
  status: string;
  tasks_completed: number;
  tasks_approved: number;
  tasks_rejected: number;
  confidence_score: number;
  last_active_at: string | null;
  config: any;
  memory: any;
  performance_data: any;
  created_at: string;
}

export interface AriaAgentTask {
  id: string;
  agent_id: string;
  creator_id: string;
  agent_type: string;
  task_type: string;
  task_title: string;
  status: string;
  confidence: number;
  requires_approval: boolean;
  input_data: any;
  output_data: any;
  creator_feedback: string | null;
  was_approved: boolean | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface AriaInsight {
  id: string;
  creator_id: string;
  agent_type: string;
  insight_type: string;
  title: string;
  body: string;
  action_label: string | null;
  action_url: string | null;
  priority: number;
  confidence: number;
  is_read: boolean;
  source_task_id: string | null;
  created_at: string;
}

export function useAriaAgents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aria-agents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aria_agents")
        .select("*")
        .eq("creator_id", user!.id);
      if (error) throw error;

      // Auto-initialize all 5 agents if none exist
      if (!data || data.length === 0) {
        const agentTypes = ["content", "growth", "community", "sales", "operations"];
        const inserts = agentTypes.map(t => ({ creator_id: user!.id, agent_type: t }));
        const { data: newAgents, error: insertError } = await supabase
          .from("aria_agents")
          .upsert(inserts, { onConflict: "creator_id,agent_type" })
          .select("*");
        if (insertError) throw insertError;

        // Also ensure usage tracking row exists
        const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
        await supabase.from("aria_usage_tracking").upsert({
          creator_id: user!.id,
          month: currentMonth,
          budget_limit: 500,
        }, { onConflict: "creator_id,month" });

        return (newAgents || []) as unknown as AriaAgent[];
      }

      return (data || []) as unknown as AriaAgent[];
    },
    enabled: !!user,
  });
}

export function useAriaAgentTasks(status?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aria-agent-tasks", user?.id, status],
    queryFn: async () => {
      let query = supabase
        .from("aria_agent_tasks")
        .select("*")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as AriaAgentTask[];
    },
    enabled: !!user,
  });
}

export function useAriaPendingTasks() {
  return useAriaAgentTasks("pending");
}

export function useAriaInsights() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aria-insights", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aria_agent_insights")
        .select("*")
        .eq("creator_id", user!.id)
        .eq("is_read", false)
        .order("priority", { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data || []) as unknown as AriaInsight[];
    },
    enabled: !!user,
  });
}

export function useAriaUsage() {
  const { user } = useAuth();
  const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
  return useQuery({
    queryKey: ["aria-usage", user?.id, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aria_usage_tracking")
        .select("*")
        .eq("creator_id", user!.id)
        .eq("month", currentMonth)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useAriaDailyReport() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aria-daily-report", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aria_daily_reports")
        .select("*")
        .eq("creator_id", user!.id)
        .order("report_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useApproveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, feedback }: { taskId: string; feedback?: string }) => {
      const { error } = await supabase
        .from("aria_agent_tasks")
        .update({
          status: "approved",
          was_approved: true,
          creator_feedback: feedback || null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskId);
      if (error) throw error;

      // Get task to update agent confidence
      const { data: taskData } = await supabase.from("aria_agent_tasks").select("agent_id").eq("id", taskId).single();
      const taskRow = taskData as any;
      if (taskRow?.agent_id) {
        const { data: agentData } = await supabase.from("aria_agents").select("*").eq("id", taskRow.agent_id).single();
        const agentRow = agentData as any;
        if (agentRow) {
          const newConf = 0.9 * (agentRow.confidence_score || 0.5) + 0.1 * 1.0;
          await supabase.from("aria_agents").update({
            confidence_score: newConf,
            tasks_approved: (agentRow.tasks_approved || 0) + 1,
          }).eq("id", agentRow.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aria-agent-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["aria-agents"] });
    },
  });
}

export function useRejectTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, feedback }: { taskId: string; feedback: string }) => {
      const { error } = await supabase
        .from("aria_agent_tasks")
        .update({
          status: "rejected",
          was_approved: false,
          creator_feedback: feedback,
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskId);
      if (error) throw error;

      // Update agent confidence and store boundary memory
      const { data: taskData2 } = await supabase.from("aria_agent_tasks").select("agent_id, agent_type, task_type, output_data, creator_id").eq("id", taskId).single();
      const taskRow2 = taskData2 as any;
      if (taskRow2?.agent_id) {
        const { data: agentData2 } = await supabase.from("aria_agents").select("*").eq("id", taskRow2.agent_id).single();
        const agentRow2 = agentData2 as any;
        if (agentRow2) {
          const newConf = 0.9 * (agentRow2.confidence_score || 0.5) + 0.1 * 0.0;
          await supabase.from("aria_agents").update({
            confidence_score: newConf,
            tasks_rejected: (agentRow2.tasks_rejected || 0) + 1,
          }).eq("id", agentRow2.id);
        }

        // Store boundary memory
        if (feedback) {
          await supabase.from("aria_agent_memory").upsert({
            creator_id: taskRow2.creator_id,
            agent_type: taskRow2.agent_type,
            memory_type: "boundary",
            key: `rejected_${taskRow2.task_type}_${Date.now()}`,
            value: { feedback, task_type: taskRow2.task_type },
            confidence: 1.0,
          }, { onConflict: "creator_id,agent_type,key" });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aria-agent-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["aria-agents"] });
    },
  });
}

export function useToggleAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ agentId, status }: { agentId: string; status: string }) => {
      const { error } = await supabase
        .from("aria_agents")
        .update({ status })
        .eq("id", agentId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["aria-agents"] }),
  });
}

export function useDismissInsight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from("aria_agent_insights")
        .update({ is_read: true })
        .eq("id", insightId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["aria-insights"] }),
  });
}

export function useTriggerAgent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ agentType, taskType }: { agentType: string; taskType: string }) => {
      const functionName = `agent-${agentType}-run`;
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { creator_id: user!.id, task_type: taskType },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aria-agent-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["aria-agents"] });
      queryClient.invalidateQueries({ queryKey: ["aria-usage"] });
    },
  });
}

export function useAriaRealtimeTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("aria-tasks-rt")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "aria_agent_tasks",
        filter: `creator_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["aria-agent-tasks"] });
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "aria_agent_insights",
        filter: `creator_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["aria-insights"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);
}
