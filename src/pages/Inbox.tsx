import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import BackNav from "@/components/BackNav";
import SEOHead from "@/components/SEOHead";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInbox } from "@/hooks/useInbox";
import { useGroupChats } from "@/hooks/useGroupChats";
import { Inbox as InboxIcon, MessageCircle, AtSign, Sparkles, Users, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type FilterTab = "all" | "dms" | "groups" | "mentions" | "stories";

export default function InboxPage() {
  const { threads, loading, unreadCount } = useInbox();
  const { groups, loading: groupsLoading } = useGroupChats();
  const [tab, setTab] = useState<FilterTab>("all");

  const filtered = useMemo(() => {
    if (tab === "all") return threads;
    if (tab === "dms") return threads.filter((t) => t.kind === "dm");
    if (tab === "mentions") return threads.filter((t) => t.kind === "mention");
    if (tab === "stories") return threads.filter((t) => t.kind === "story_reply");
    return [];
  }, [tab, threads]);

  return (
    <AppLayout>
      <SEOHead title="Inbox — UPLY" description="All your DMs, mentions, story replies, and group chats in one place." />

      <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
        <BackNav label="Inbox" />

        <div className="flex items-center justify-between mt-4 mb-3">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <InboxIcon className="w-5 h-5" /> Inbox
            {unreadCount > 0 && (
              <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">
                {unreadCount} new
              </span>
            )}
          </h1>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)} className="mb-4">
          <TabsList className="bg-secondary/50 w-full overflow-x-auto justify-start">
            <TabsTrigger value="all" className="text-xs gap-1">All</TabsTrigger>
            <TabsTrigger value="dms" className="text-xs gap-1">
              <MessageCircle className="w-3 h-3" /> DMs
            </TabsTrigger>
            <TabsTrigger value="groups" className="text-xs gap-1">
              <Users className="w-3 h-3" /> Groups
            </TabsTrigger>
            <TabsTrigger value="mentions" className="text-xs gap-1">
              <AtSign className="w-3 h-3" /> Mentions
            </TabsTrigger>
            <TabsTrigger value="stories" className="text-xs gap-1">
              <Sparkles className="w-3 h-3" /> Stories
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "groups" ? (
          <GroupsList loading={groupsLoading} groups={groups} />
        ) : loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyInbox tab={tab} />
        ) : (
          <ul className="space-y-1">
            {filtered.map((t) => (
              <li key={t.id}>
                <Link
                  to={t.link}
                  className={`flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors ${
                    t.unread ? "bg-accent/30" : ""
                  }`}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={t.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">{t.fallback}</AvatarFallback>
                    </Avatar>
                    {t.unread && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${t.unread ? "font-bold" : "font-semibold"}`}>
                        {t.kind === "story_reply" && <Sparkles className="inline w-3 h-3 mr-1 text-primary" />}
                        {t.kind === "mention" && <AtSign className="inline w-3 h-3 mr-1 text-primary" />}
                        {t.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(t.timestamp), { addSuffix: false })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{t.preview}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}

function GroupsList({ loading, groups }: { loading: boolean; groups: any[] }) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!groups.length) {
    return (
      <div className="text-center py-16">
        <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No group chats yet</p>
        <p className="text-xs text-muted-foreground/70">Group chats are auto-created when you RSVP to events</p>
      </div>
    );
  }
  return (
    <ul className="space-y-1">
      {groups.map((g: any) => (
        <li key={g.id}>
          <Link
            to={`/messages?g=${g.id}`}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors"
          >
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-primary/10 text-primary">
                {g.event_id ? "📅" : <Users className="w-5 h-5" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{g.name ?? "Group"}</p>
              <p className="text-xs text-muted-foreground truncate">{g.last_message ?? `${g.member_count} members`}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyInbox({ tab }: { tab: FilterTab }) {
  const map: Record<string, { icon: any; title: string; desc: string }> = {
    all: { icon: InboxIcon, title: "Your inbox is empty", desc: "Conversations, mentions, and story replies will appear here." },
    dms: { icon: MessageCircle, title: "No direct messages", desc: "Start one from any creator's profile." },
    mentions: { icon: AtSign, title: "No mentions yet", desc: "When someone @-tags you in a post, it'll show here." },
    stories: { icon: Sparkles, title: "No story replies", desc: "Replies to your stories arrive here." },
  };
  const { icon: Icon, title, desc } = map[tab] ?? map.all;
  return (
    <div className="text-center py-16">
      <Icon className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}
