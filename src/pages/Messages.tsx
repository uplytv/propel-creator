import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, ArrowLeft, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AppLayout from "@/components/layout/AppLayout";
import BackNav from "@/components/BackNav";
import { useDirectMessages, useConversationMessages, Conversation } from "@/hooks/useDirectMessages";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import EmptyState from "@/components/ui/EmptyState";

function ConversationList({
  conversations,
  loading,
  onSelect,
}: {
  conversations: Conversation[];
  loading: boolean;
  onSelect: (c: Conversation) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="No messages yet"
        description="Start a conversation from any creator's profile"
      />
    );
  }

  return (
    <div className="space-y-1">
      {conversations.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c)}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left"
        >
          <div className="relative">
            <Avatar className="w-12 h-12">
              <AvatarImage src={c.other_user?.avatar_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {(c.other_user?.display_name || "U")[0]}
              </AvatarFallback>
            </Avatar>
            {(c.unread_count ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {c.unread_count}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground truncate">{c.other_user?.display_name || "User"}</p>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}
              </span>
            </div>
            {c.last_message && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">{c.last_message}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

function ChatView({
  conversation,
  onBack,
}: {
  conversation: Conversation;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const { messages, loading } = useConversationMessages(conversation.id);
  const { sendMessage, markRead } = useDirectMessages();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markRead(conversation.id);
  }, [conversation.id, markRead, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await sendMessage(conversation.id, text.trim());
    setText("");
    setSending(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Avatar className="w-9 h-9">
          <AvatarImage src={conversation.other_user?.avatar_url || ""} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {(conversation.other_user?.display_name || "U")[0]}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{conversation.other_user?.display_name || "User"}</p>
          {conversation.other_user?.username && (
            <p className="text-[11px] text-muted-foreground">@{conversation.other_user.username}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm ${
                  isMine
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2"
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-10 rounded-full bg-muted border-0"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!text.trim() || sending}
            className="rounded-full h-10 w-10 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { conversations, loading } = useDirectMessages();
  const [active, setActive] = useState<Conversation | null>(null);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
        {active ? (
          <ChatView conversation={active} onBack={() => setActive(null)} />
        ) : (
          <>
            <BackNav label="Messages" />
            <div className="mt-4">
              <ConversationList conversations={conversations} loading={loading} onSelect={setActive} />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
