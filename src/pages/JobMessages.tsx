import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Send, ArrowLeft, Briefcase, Loader2, Circle
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import { useJobConversations, useJobMessages, useSendJobMessage, type JobConversation } from "@/hooks/useJobMessages";
import { formatDistanceToNow } from "date-fns";

function ConversationList({
  conversations,
  selected,
  onSelect,
  isLoading,
}: {
  conversations: JobConversation[];
  selected?: string;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No conversations yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Start a conversation from a job listing
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              selected === conv.id
                ? "bg-primary/10 border border-primary/20"
                : "hover:bg-secondary/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {conv.other_avatar ? (
                  <img src={conv.other_avatar} alt={conv.other_name || ""} className="w-full h-full rounded-full object-cover" loading="lazy" />
                ) : (
                  conv.other_name?.charAt(0) || "U"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{conv.other_name}</span>
                  {(conv.unread_count || 0) > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex-shrink-0">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> {conv.job_title}
                </p>
                {conv.last_message && (
                  <p className="text-xs text-muted-foreground/70 truncate mt-1">
                    {conv.last_message}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}

function ChatPanel({ conversationId, conversation }: { conversationId: string; conversation?: JobConversation }) {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useJobMessages(conversationId);
  const sendMessage = useSendJobMessage();
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const content = newMessage.trim();
    if (!content) return;
    sendMessage.mutate({ conversationId, content });
    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
          {conversation?.other_avatar ? (
            <img src={conversation.other_avatar} alt={conversation.other_name || ""} className="w-full h-full rounded-full object-cover" loading="lazy" />
          ) : (
            conversation?.other_name?.charAt(0) || "U"
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{conversation?.other_name}</p>
          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> {conversation?.job_title}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-3/4 rounded-lg" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Start the conversation...
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary rounded-bl-md"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || sendMessage.isPending}
          >
            {sendMessage.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function JobMessages() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeConvId = searchParams.get("conv");
  const { data: conversations = [], isLoading } = useJobConversations();

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  const selectConversation = (id: string) => {
    setSearchParams({ conv: id });
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")} className="gap-1.5 -ml-2">
            <ArrowLeft className="w-4 h-4" /> Jobs
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> Messages
          </h1>
        </div>

        <div className="glass-card overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
          <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] h-full">
            {/* Conversation List */}
            <div className="border-r border-border h-full overflow-hidden">
              <div className="p-3 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Conversations ({conversations.length})
                </p>
              </div>
              <ConversationList
                conversations={conversations}
                selected={activeConvId || undefined}
                onSelect={selectConversation}
                isLoading={isLoading}
              />
            </div>

            {/* Chat Panel */}
            <div className="h-full overflow-hidden">
              {activeConvId && activeConversation ? (
                <ChatPanel
                  conversationId={activeConvId}
                  conversation={activeConversation}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground text-sm">
                    {conversations.length > 0
                      ? "Select a conversation to start chatting"
                      : "No conversations yet — message someone from a job listing"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
