import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, ArrowLeft, Loader2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AppLayout from "@/components/layout/AppLayout";
import BackNav from "@/components/BackNav";
import { useDirectMessages, useConversationMessages, Conversation } from "@/hooks/useDirectMessages";
import { useGroupChats, useGroupMessages, GroupConversation } from "@/hooks/useGroupChats";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import EmptyState from "@/components/ui/EmptyState";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

function ConversationList({
  conversations, loading, onSelect,
}: {
  conversations: Conversation[]; loading: boolean; onSelect: (c: Conversation) => void;
}) {
  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (conversations.length === 0) return <EmptyState icon={MessageCircle} title="No messages yet" description="Start a conversation from any creator's profile" />;

  return (
    <div className="space-y-1">
      {conversations.map((c) => (
        <button key={c.id} onClick={() => onSelect(c)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left">
          <div className="relative">
            <Avatar className="w-12 h-12">
              <AvatarImage src={c.other_user?.avatar_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary">{(c.other_user?.display_name || "U")[0]}</AvatarFallback>
            </Avatar>
            {(c.unread_count ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{c.unread_count}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground truncate">{c.other_user?.display_name || "User"}</p>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}
              </span>
            </div>
            {c.last_message && <p className="text-sm text-muted-foreground truncate mt-0.5">{c.last_message}</p>}
          </div>
        </button>
      ))}
    </div>
  );
}

function GroupList({
  groups, loading, onSelect,
}: {
  groups: GroupConversation[]; loading: boolean; onSelect: (g: GroupConversation) => void;
}) {
  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (groups.length === 0) return <EmptyState icon={Users} title="No group chats yet" description="Group chats are auto-created when you RSVP to events" />;

  return (
    <div className="space-y-1">
      {groups.map((g) => (
        <button key={g.id} onClick={() => onSelect(g)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left">
          <Avatar className="w-12 h-12">
            {g.avatar_url ? <AvatarImage src={g.avatar_url} /> : null}
            <AvatarFallback className="bg-primary/10 text-primary">
              {g.event_id ? "📅" : <Users className="w-5 h-5" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground truncate">{g.name || "Group"}</p>
              <span className="text-[10px] text-muted-foreground">{g.member_count} members</span>
            </div>
            {g.last_message && <p className="text-sm text-muted-foreground truncate mt-0.5">{g.last_message}</p>}
          </div>
        </button>
      ))}
    </div>
  );
}

function ChatView({ conversation, onBack }: { conversation: Conversation; onBack: () => void }) {
  const { user } = useAuth();
  const { messages, loading } = useConversationMessages(conversation.id);
  const { sendMessage, markRead } = useDirectMessages();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { markRead(conversation.id); }, [conversation.id, markRead, messages.length]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await sendMessage(conversation.id, text.trim());
    setText("");
    setSending(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 p-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0"><ArrowLeft className="w-5 h-5" /></Button>
        <Avatar className="w-9 h-9">
          <AvatarImage src={conversation.other_user?.avatar_url || ""} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">{(conversation.other_user?.display_name || "U")[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{conversation.other_user?.display_name || "User"}</p>
          {conversation.other_user?.username && <p className="text-[11px] text-muted-foreground">@{conversation.other_user.username}</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                  <p className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {isMine && <span className={`text-[10px] ${msg.read ? "text-primary-foreground/80" : "text-primary-foreground/40"}`}>{msg.read ? "✓✓" : "✓"}</span>}
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." className="flex-1 h-10 rounded-full bg-muted border-0" />
          <Button type="submit" size="icon" disabled={!text.trim() || sending} className="rounded-full h-10 w-10 shrink-0"><Send className="w-4 h-4" /></Button>
        </form>
      </div>
    </div>
  );
}

function GroupChatView({ group, onBack }: { group: GroupConversation; onBack: () => void }) {
  const { user } = useAuth();
  const { messages, loading } = useGroupMessages(group.id);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() || !user || sending) return;
    setSending(true);
    await supabase.from("group_messages").insert({
      conversation_id: group.id,
      user_id: user.id,
      content: text.trim(),
    });
    setText("");
    setSending(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 p-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0"><ArrowLeft className="w-5 h-5" /></Button>
        <Avatar className="w-9 h-9">
          <AvatarFallback className="bg-primary/10 text-primary text-sm">{group.event_id ? "📅" : "👥"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{group.name || "Group"}</p>
          <p className="text-[11px] text-muted-foreground">{group.member_count} members</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
        {messages.map((msg) => {
          const isMine = msg.user_id === user?.id;
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              {!isMine && (
                <Avatar className="w-6 h-6 mr-2 mt-1 flex-shrink-0">
                  <AvatarImage src={msg.profile?.avatar_url || ""} />
                  <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{(msg.profile?.display_name || "U")[0]}</AvatarFallback>
                </Avatar>
              )}
              <div className={`max-w-[75%] ${isMine ? "" : ""}`}>
                {!isMine && <p className="text-[10px] font-semibold text-muted-foreground mb-0.5 ml-1">{msg.profile?.display_name || "User"}</p>}
                <div className={`px-3.5 py-2 rounded-2xl text-sm ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60 text-right" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." className="flex-1 h-10 rounded-full bg-muted border-0" />
          <Button type="submit" size="icon" disabled={!text.trim() || sending} className="rounded-full h-10 w-10 shrink-0"><Send className="w-4 h-4" /></Button>
        </form>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { conversations, loading: dmLoading } = useDirectMessages();
  const { groups, loading: groupLoading } = useGroupChats();
  const [active, setActive] = useState<Conversation | null>(null);
  const [activeGroup, setActiveGroup] = useState<GroupConversation | null>(null);
  const [tab, setTab] = useState<"dms" | "groups">("dms");

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
        {active ? (
          <ChatView conversation={active} onBack={() => setActive(null)} />
        ) : activeGroup ? (
          <GroupChatView group={activeGroup} onBack={() => setActiveGroup(null)} />
        ) : (
          <>
            <BackNav label="Messages" />
            <Tabs value={tab} onValueChange={(v) => setTab(v as "dms" | "groups")} className="mt-4 mb-4">
              <TabsList className="bg-secondary/50 w-full">
                <TabsTrigger value="dms" className="flex-1 text-xs gap-1">
                  <MessageCircle className="w-3.5 h-3.5" /> Direct
                </TabsTrigger>
                <TabsTrigger value="groups" className="flex-1 text-xs gap-1">
                  <Users className="w-3.5 h-3.5" /> Groups
                  {groups.length > 0 && <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded-full">{groups.length}</span>}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {tab === "dms" ? (
              <ConversationList conversations={conversations} loading={dmLoading} onSelect={setActive} />
            ) : (
              <GroupList groups={groups} loading={groupLoading} onSelect={setActiveGroup} />
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
