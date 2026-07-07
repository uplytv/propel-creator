import { useState, useEffect, useRef } from "react";
import { X, Send, Loader2, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface BroadcastChannelProps {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string | null;
  onClose: () => void;
}

export default function BroadcastChannel({ creatorId, creatorName, creatorAvatar, onClose }: BroadcastChannelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isCreator = user?.id === creatorId;

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["broadcast-messages", creatorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("broadcast_messages")
        .select("*, profiles:creator_id(display_name, avatar_url)")
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []).reverse();
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages.length]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`broadcast-${creatorId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "broadcast_messages", filter: `creator_id=eq.${creatorId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["broadcast-messages", creatorId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [creatorId, queryClient]);

  const handleSend = async () => {
    if (!text.trim() || !user || sending) return;
    setSending(true);
    const { error } = await supabase.from("broadcast_messages").insert({
      creator_id: user.id,
      content: text.trim(),
      message_type: "text",
    });
    if (error) {
      toast.error("Failed to send broadcast");
    } else {
      setText("");
      setComposing(false);
      queryClient.invalidateQueries({ queryKey: ["broadcast-messages", creatorId] });
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: "hsl(var(--background))" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={onClose}>
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
        <Avatar className="w-8 h-8">
          <AvatarImage src={creatorAvatar || ""} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">{creatorName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{creatorName}</p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Megaphone className="w-3 h-3" /> Channel · {messages.length} messages
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {messages.map((msg: any) => (
          <div key={msg.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={creatorAvatar || ""} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{creatorName[0]}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-semibold text-foreground">{creatorName}</span>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
              </span>
            </div>
            <div className="ml-8 rounded-xl px-3 py-2 text-sm text-foreground" style={{ background: "hsl(var(--muted))" }}>
              {msg.content}
            </div>
          </div>
        ))}
        {!isLoading && messages.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No broadcasts yet</p>
          </div>
        )}
      </div>

      {/* Creator compose */}
      {isCreator && (
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Broadcast to your followers..."
              className="flex-1 bg-muted border-0 rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-primary-foreground disabled:opacity-40"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
