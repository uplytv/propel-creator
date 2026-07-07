import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Ban, Loader2, MoreVertical, RefreshCw, Send, Trash2 } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useDmMessages, type DmMessage, type DmThread } from "@/hooks/useDm";
import { blockDmUser, unblockDmUser, fetchMyDmBlock, DM_MAX_LENGTH } from "@/lib/dm";

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d, yyyy");
}

interface Props {
  thread: DmThread;
  onBack: () => void;
}

export default function DmThreadView({ thread, onBack }: Props) {
  const { user } = useAuth();
  const { messages, loading, error, sendMessage, removeFailedMessage, markRead, refetch } = useDmMessages(thread.id);
  const [text, setText] = useState("");
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const otherName = thread.other_user.display_name || thread.other_user.username || "Member";

  // Block state for the header menu (only my own blocks are ever visible).
  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    fetchMyDmBlock(user.id, thread.other_user.user_id)
      .then((blocked) => {
        if (!cancelled) setBlockedByMe(blocked);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user, thread.other_user.user_id]);

  // Mark incoming messages read while this thread is on screen.
  const unreadIncoming = messages.some((m) => !m.read && m.sender_id !== user?.id && !m.pending && !m.failed);
  useEffect(() => {
    if (unreadIncoming) markRead();
  }, [unreadIncoming, markRead, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const groups = useMemo(() => {
    const out: { label: string; items: DmMessage[] }[] = [];
    for (const m of messages) {
      const label = dayLabel(m.created_at);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(m);
      else out.push({ label, items: [m] });
    }
    return out;
  }, [messages]);

  const handleSend = useCallback(async () => {
    const body = text.trim();
    if (!body || blockedByMe) return;
    if (body.length > DM_MAX_LENGTH) {
      toast.error(`Messages are limited to ${DM_MAX_LENGTH} characters`);
      return;
    }
    setText("");
    const ok = await sendMessage(body);
    if (!ok) toast.error("Message could not be delivered");
  }, [text, blockedByMe, sendMessage]);

  const handleRetry = useCallback(
    async (m: DmMessage) => {
      removeFailedMessage(m.id);
      const ok = await sendMessage(m.content);
      if (!ok) toast.error("Message could not be delivered");
    },
    [removeFailedMessage, sendMessage]
  );

  const toggleBlock = useCallback(async () => {
    if (!user || blockBusy) return;
    setBlockBusy(true);
    try {
      if (blockedByMe) {
        await unblockDmUser(user.id, thread.other_user.user_id);
        setBlockedByMe(false);
        toast.success(`${otherName} unblocked`);
      } else {
        await blockDmUser(user.id, thread.other_user.user_id);
        setBlockedByMe(true);
        toast.success(`${otherName} blocked. They can no longer message you.`);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBlockBusy(false);
    }
  }, [user, blockBusy, blockedByMe, thread.other_user.user_id, otherName]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 md:hidden rounded-none" aria-label="Back to conversations">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Avatar className="w-9 h-9">
          <AvatarImage src={thread.other_user.avatar_url || ""} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">{otherName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate text-foreground">{otherName}</p>
          {thread.other_user.username && <p className="text-[11px] text-muted-foreground truncate">@{thread.other_user.username}</p>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-none" aria-label="Conversation options">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-none">
            <DropdownMenuItem onClick={toggleBlock} disabled={blockBusy} className="rounded-none">
              <Ban className="w-4 h-4 mr-2" />
              {blockedByMe ? `Unblock ${otherName}` : `Block ${otherName}`}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && !loading && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-3">Couldn't load this conversation.</p>
            <Button variant="outline" size="sm" className="rounded-none" onClick={refetch}>
              <RefreshCw className="w-3.5 h-3.5 mr-2" /> Try again
            </Button>
          </div>
        )}
        {!loading && !error && messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm font-semibold text-foreground">Start the conversation</p>
            <p className="text-xs text-muted-foreground mt-1">Messages are private between you and {otherName}.</p>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.label}>
            <div className="flex items-center gap-3 my-4" role="separator" aria-label={group.label}>
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-2">
              {group.items.map((m) => {
                const isMine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] px-3.5 py-2 text-sm border ${
                        isMine
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-foreground border-border"
                      } ${m.pending ? "opacity-60" : ""} ${m.failed ? "border-destructive bg-destructive/10 text-foreground" : ""}`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      <div className={`flex items-center gap-2 mt-1 ${isMine ? "justify-end" : ""}`}>
                        {m.failed ? (
                          <span className="flex items-center gap-2 text-[10px] text-destructive font-semibold">
                            Failed to send
                            <button onClick={() => handleRetry(m)} className="underline" aria-label="Retry sending message">
                              Retry
                            </button>
                            <button onClick={() => removeFailedMessage(m.id)} aria-label="Discard message">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </span>
                        ) : (
                          <>
                            <span className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              {m.pending ? "Sending…" : format(new Date(m.created_at), "h:mm a")}
                            </span>
                            {isMine && !m.pending && (
                              <span className={`text-[10px] ${m.read ? "text-primary-foreground/80" : "text-primary-foreground/40"}`}>
                                {m.read ? "Seen" : "Sent"}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="p-3 border-t border-border shrink-0">
        {blockedByMe ? (
          <div className="flex items-center justify-between gap-3 p-3 bg-muted border border-border">
            <p className="text-xs text-muted-foreground">
              You've blocked {otherName}. Unblock them to send messages.
            </p>
            <Button variant="outline" size="sm" className="rounded-none shrink-0" onClick={toggleBlock} disabled={blockBusy}>
              Unblock
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2"
          >
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Message ${otherName}…`}
              maxLength={DM_MAX_LENGTH}
              rows={1}
              className="flex-1 min-h-[40px] max-h-32 resize-none rounded-none bg-muted border-border text-sm"
              aria-label={`Message ${otherName}`}
            />
            <Button type="submit" size="icon" disabled={!text.trim()} className="rounded-none h-10 w-10 shrink-0" aria-label="Send message">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        )}
        {text.length > DM_MAX_LENGTH - 200 && !blockedByMe && (
          <p className="text-[10px] text-muted-foreground mt-1 text-right">
            {text.length}/{DM_MAX_LENGTH}
          </p>
        )}
      </div>
    </div>
  );
}
