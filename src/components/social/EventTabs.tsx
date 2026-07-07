import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Users, Image as ImageIcon, ShoppingBag, Send, Loader2, Camera } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import MarketplaceComposer from "@/components/social/MarketplaceComposer";

type Tab = "chat" | "people" | "gallery" | "marketplace";

interface EventTabsProps {
  eventId: string;
  eventTitle?: string;
}

export default function EventTabs({ eventId, eventTitle }: EventTabsProps) {
  const [tab, setTab] = useState<Tab>("chat");

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "people", label: "People", icon: Users },
    { id: "gallery", label: "Gallery", icon: ImageIcon },
    { id: "marketplace", label: "Buy/Sell", icon: ShoppingBag },
  ];

  return (
    <div className="mt-6 border-t" style={{ borderColor: "hsl(var(--border))" }}>
      <div className="flex sticky top-[44px] z-30 bg-background/95 backdrop-blur"
        style={{ borderBottom: "1px solid hsl(var(--border))" }}
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-3 flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors"
              style={{
                color: active ? "#3D7CFF" : "hsl(var(--muted-foreground))",
                borderBottom: active ? "2px solid #3D7CFF" : "2px solid transparent",
              }}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-[300px]">
        {tab === "chat" && <EventChatTab eventId={eventId} />}
        {tab === "people" && <EventPeopleTab eventId={eventId} />}
        {tab === "gallery" && <EventGalleryTab eventId={eventId} />}
        {tab === "marketplace" && <EventMarketplaceTab eventId={eventId} eventTitle={eventTitle} />}
      </div>
    </div>
  );
}

// -------- CHAT --------
function EventChatTab({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["event-chat", eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_chat_messages")
        .select("*, profiles:user_id(display_name, avatar_url, username)")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true })
        .limit(100);
      return data || [];
    },
    refetchInterval: 5000,
    staleTime: 2000,
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`event-chat-${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "event_chat_messages", filter: `event_id=eq.${eventId}` },
        () => qc.invalidateQueries({ queryKey: ["event-chat", eventId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      if (!text.trim()) return;
      const { error } = await supabase
        .from("event_chat_messages")
        .insert({ event_id: eventId, user_id: user.id, content: text.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["event-chat", eventId] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to send"),
  });

  return (
    <div className="flex flex-col h-[60vh]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center">Loading…</p>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-3xl block mb-2">💬</span>
            <p className="text-sm text-muted-foreground">Be the first to say something</p>
          </div>
        ) : (
          messages.map((m: any) => (
            <div key={m.id} className="flex items-start gap-2">
              <Avatar className="w-7 h-7 flex-shrink-0">
                <AvatarImage src={m.profiles?.avatar_url || undefined} />
                <AvatarFallback className="bg-muted text-foreground text-[10px]">
                  {(m.profiles?.display_name || "U").slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {m.profiles?.display_name || "User"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground/85 break-words">{m.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); send.mutate(); }}
        className="px-3 py-2 flex gap-2"
        style={{ borderTop: "1px solid hsl(var(--border))" }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={user ? "Say hi…" : "Sign in to chat"}
          disabled={!user || send.isPending}
          className="flex-1 px-3 py-2 rounded-full text-sm bg-muted text-foreground placeholder:text-muted-foreground outline-none focus:bg-muted/80"
        />
        <button
          type="submit"
          disabled={!user || !text.trim() || send.isPending}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95"
          style={{ backgroundColor: "#3D7CFF", color: "#0A0A0A", opacity: !text.trim() ? 0.4 : 1 }}
          aria-label="Send"
        >
          {send.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}

// -------- PEOPLE --------
function EventPeopleTab({ eventId }: { eventId: string }) {
  const navigate = useNavigate();

  const { data: people = [], isLoading } = useQuery({
    queryKey: ["event-people", eventId],
    queryFn: async () => {
      const { data: att } = await supabase
        .from("attendance")
        .select("user_id, status")
        .eq("event_id", eventId)
        .eq("status", "going")
        .limit(60);
      const ids = (att || []).map((a: any) => a.user_id);
      if (ids.length === 0) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", ids);
      return profs || [];
    },
    staleTime: 30_000,
  });

  if (isLoading) return <p className="text-center text-xs text-muted-foreground py-12">Loading…</p>;

  if (people.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <span className="text-3xl block mb-2">🎟️</span>
        <p className="text-sm text-muted-foreground">No one has marked Going yet — be the first!</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 grid grid-cols-3 gap-3">
      {people.map((p: any) => (
        <button
          key={p.user_id}
          onClick={() => navigate(`/${p.username || p.user_id}`)}
          className="flex flex-col items-center gap-1.5"
        >
          <Avatar className="w-14 h-14">
            <AvatarImage src={p.avatar_url || undefined} />
            <AvatarFallback className="bg-muted text-foreground text-xs">
              {(p.display_name || "U").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <span className="text-[11px] font-semibold text-foreground truncate w-full text-center">
            {p.display_name || "User"}
          </span>
        </button>
      ))}
    </div>
  );
}

// -------- GALLERY --------
function EventGalleryTab({ eventId }: { eventId: string }) {
  // Use stories tagged to event + event_chat media
  const { data: media = [], isLoading } = useQuery({
    queryKey: ["event-gallery", eventId],
    queryFn: async () => {
      const [storiesRes, chatRes] = await Promise.all([
        supabase.from("stories").select("id, media_url, user_id, created_at").eq("event_id", eventId).order("created_at", { ascending: false }).limit(30),
        supabase.from("event_chat_messages").select("id, media_url, user_id, created_at").eq("event_id", eventId).not("media_url", "is", null).order("created_at", { ascending: false }).limit(30),
      ]);
      const items = [
        ...((storiesRes.data || []).map((s: any) => ({ ...s, _kind: "story" }))),
        ...((chatRes.data || []).map((c: any) => ({ ...c, _kind: "chat" }))),
      ];
      return items.filter((i) => i.media_url);
    },
    staleTime: 30_000,
  });

  if (isLoading) return <p className="text-center text-xs text-muted-foreground py-12">Loading…</p>;

  const navigate = useNavigate();
  const PostCta = (
    <button
      onClick={() => navigate(`/social?compose=story&event=${eventId}`)}
      className="w-full mt-2 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95"
      style={{ backgroundColor: "rgba(61, 124, 255,0.12)", color: "#3D7CFF", border: "1px solid rgba(61, 124, 255,0.3)" }}
    >
      <Camera className="w-3.5 h-3.5" /> Add to Gallery — Post a Story
    </button>
  );

  if (media.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <span className="text-3xl block mb-2">📸</span>
        <p className="text-sm text-muted-foreground">No photos yet</p>
        <p className="text-[11px] text-muted-foreground/80 mt-1">Post a story tagged to this event to fill the gallery</p>
        <div className="max-w-[260px] mx-auto mt-4">{PostCta}</div>
      </div>
    );
  }

  return (
    <div className="px-2 py-2">
      <div className="grid grid-cols-3 gap-0.5">
        {media.map((m: any) => (
          <div key={`${m._kind}-${m.id}`} className="aspect-square overflow-hidden">
            <img src={m.media_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
      <div className="px-2 mt-2">{PostCta}</div>
    </div>
  );
}

// -------- MARKETPLACE --------
function EventMarketplaceTab({ eventId, eventTitle }: { eventId: string; eventTitle?: string }) {
  const { user } = useAuth();
  const [composerOpen, setComposerOpen] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["event-marketplace", eventId],
    queryFn: async () => {
      const { data: posts } = await supabase
        .from("social_posts")
        .select("*")
        .eq("event_id", eventId)
        .eq("post_type", "marketplace")
        .order("created_at", { ascending: false })
        .limit(40);
      const userIds = Array.from(new Set((posts || []).map((p: any) => p.user_id))) as string[];
      if (userIds.length === 0) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", userIds);
      const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
      return (posts || []).map((p: any) => ({ ...p, profile: map.get(p.user_id) }));
    },
    staleTime: 30_000,
  });

  if (isLoading) return <p className="text-center text-xs text-muted-foreground py-12">Loading…</p>;

  return (
    <div className="px-4 py-3">
      {composerOpen && <MarketplaceComposer eventId={eventId} onClose={() => setComposerOpen(false)} />}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">
          Buy or sell tickets, gear, and rides for {eventTitle ? <span className="text-foreground/80">{eventTitle}</span> : "this event"}
        </p>
        <button
          className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-transform active:scale-95"
          style={{ backgroundColor: "#3D7CFF", color: "#0A0A0A" }}
          onClick={() => {
            if (!user) return toast.error("Sign in to post");
            setComposerOpen(true);
          }}
        >
          + Post
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-10">
          <span className="text-3xl block mb-2">🛍️</span>
          <p className="text-sm text-muted-foreground">No listings yet</p>
          <p className="text-[11px] text-muted-foreground/80 mt-1">Be the first to post a ticket or item</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {items.map((it: any) => (
            <div
              key={it.id}
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            >
              {it.media_urls?.[0] && (
                <img src={it.media_urls[0]} alt="" className="w-full aspect-square object-cover" loading="lazy" />
              )}
              <div className="p-2.5">
                <div className="flex items-center justify-between gap-1 mb-1">
                  {it.marketplace_category && (
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                      {it.marketplace_category}
                    </span>
                  )}
                  {it.price != null && (
                    <span className="text-xs font-bold" style={{ color: "#3D7CFF" }}>
                      ${Number(it.price).toFixed(0)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground font-semibold line-clamp-2">{it.content}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {it.profile?.display_name || "User"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
