import { MessageCircle, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { formatDistanceToNow } from "date-fns";
import type { DmThread } from "@/hooks/useDm";

interface Props {
  threads: DmThread[];
  activeId: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (thread: DmThread) => void;
  onRetry: () => void;
}

export default function DmThreadList({ threads, activeId, loading, error, onSelect, onRetry }: Props) {
  if (loading) {
    return (
      <div className="p-2 space-y-1" aria-busy="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="w-11 h-11 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-32 rounded-none" />
              <Skeleton className="h-3 w-44 rounded-none" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground mb-3">Couldn't load your messages.</p>
        <Button variant="outline" size="sm" className="rounded-none" onClick={onRetry}>
          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Try again
        </Button>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="No direct messages yet"
        description="Open a member's profile in any community and tap Message to start a conversation."
      />
    );
  }

  return (
    <ul className="p-2 space-y-0.5" role="list">
      {threads.map((t) => {
        const name = t.other_user.display_name || t.other_user.username || "Member";
        const isActive = t.id === activeId;
        const hasUnread = t.unread_count > 0;
        return (
          <li key={t.id}>
            <button
              onClick={() => onSelect(t)}
              aria-current={isActive ? "true" : undefined}
              className={`w-full flex items-center gap-3 p-3 text-left transition-colors border ${
                isActive ? "bg-accent border-border" : "border-transparent hover:bg-accent/50"
              }`}
            >
              <div className="relative shrink-0">
                <Avatar className="w-11 h-11">
                  <AvatarImage src={t.other_user.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary">{name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                {hasUnread && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary border-2 border-background"
                    aria-label={`${t.unread_count} unread`}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm truncate ${hasUnread ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>
                    {name}
                  </p>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: false })}
                  </span>
                </div>
                <p className={`text-xs truncate mt-0.5 ${hasUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {t.last_message ?? "Say hello"}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
