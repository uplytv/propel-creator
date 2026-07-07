import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import SEOHead from "@/components/SEOHead";
import BackNav from "@/components/BackNav";
import DmThreadList from "@/components/dm/DmThreadList";
import DmThreadView from "@/components/dm/DmThreadView";
import { useAuth } from "@/context/AuthContext";
import { useDmThreads, type DmThread } from "@/hooks/useDm";
import { getOrCreateDmThread } from "@/lib/dm";

/**
 * Member DMs v1 — two-pane direct messages.
 * Deep links: /dm?c=<threadId> opens a thread; /dm?to=<userId> creates-or-gets
 * the 1:1 thread with that user, then swaps the URL to ?c=.
 */
export default function DirectMessages() {
  const { user } = useAuth();
  const { threads, loading, error, refetch } = useDmThreads();
  const [params, setParams] = useSearchParams();
  const creatingRef = useRef(false);

  const activeId = params.get("c");
  const toUserId = params.get("to");

  // ?to=<userId> → create-or-get thread, then navigate to it.
  useEffect(() => {
    if (!toUserId || !user || creatingRef.current) return;
    if (toUserId === user.id) {
      setParams({}, { replace: true });
      return;
    }
    creatingRef.current = true;
    getOrCreateDmThread(user.id, toUserId)
      .then((id) => {
        setParams({ c: id }, { replace: true });
        refetch();
      })
      .catch(() => {
        toast.error("Couldn't start this conversation");
        setParams({}, { replace: true });
      })
      .finally(() => {
        creatingRef.current = false;
      });
  }, [toUserId, user, setParams, refetch]);

  const activeThread: DmThread | null = useMemo(
    () => threads.find((t) => t.id === activeId) ?? null,
    [threads, activeId]
  );

  const resolvingThread = !!toUserId || (!!activeId && !activeThread && loading);

  return (
    <AppLayout>
      <SEOHead title="Messages — UPLY" description="Private direct messages with community members and creators." />
      <div className="max-w-5xl mx-auto px-4 py-4 pb-24 md:pb-8">
        <div className={activeId ? "hidden md:block" : ""}>
          <BackNav label="Direct Messages" />
        </div>

        <div className="mt-4 border border-border bg-card md:grid md:grid-cols-[320px_1fr] h-[calc(100vh-11rem)] md:h-[calc(100vh-9rem)]">
          {/* Thread list (left pane; hidden on mobile when a thread is open) */}
          <div className={`h-full overflow-y-auto md:border-r md:border-border ${activeId || resolvingThread ? "hidden md:block" : ""}`}>
            <DmThreadList
              threads={threads}
              activeId={activeId}
              loading={loading}
              error={error}
              onSelect={(t) => setParams({ c: t.id })}
              onRetry={refetch}
            />
          </div>

          {/* Active thread (right pane) */}
          <div className={`h-full min-h-0 ${activeId || resolvingThread ? "" : "hidden md:block"}`}>
            {activeThread ? (
              <DmThreadView thread={activeThread} onBack={() => setParams({})} />
            ) : resolvingThread ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeId && !loading ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <p className="text-sm font-semibold text-foreground">Conversation not found</p>
                <p className="text-xs text-muted-foreground mt-1">It may have been removed, or the link is wrong.</p>
              </div>
            ) : (
              <div className="h-full hidden md:flex flex-col items-center justify-center text-center px-6">
                <MessageCircle className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-semibold text-foreground">Select a conversation</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Or open a member's profile in any community and tap Message.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
