import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, CalendarDays, MapPin, Monitor, Globe, Loader2, Users, Ticket, BarChart3, Download, ScanLine, ShieldCheck, Activity, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppLayout from "@/components/layout/AppLayout";
import PageHero from "@/components/layout/PageHero";
import { WorldwideEventsTab } from "@/components/events/WorldwideEventsTab";
import { useAuth } from "@/context/AuthContext";
import { useCreatorEvents, useEventTickets, EventRow } from "@/hooks/useEvents";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import QueryErrorState from "@/components/ui/QueryErrorState";
import EventCheckIn from "@/components/events/EventCheckIn";
import EventStaffManager from "@/components/events/EventStaffManager";
import EventPromotersManager from "@/components/events/EventPromotersManager";
import { useProfile } from "@/hooks/useProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isBefore } from "date-fns";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-primary/20 text-primary",
  canceled: "bg-destructive/20 text-destructive",
  completed: "bg-muted text-muted-foreground",
};

const typeIcons: Record<string, React.ReactNode> = {
  virtual: <Monitor className="w-3.5 h-3.5" />,
  in_person: <MapPin className="w-3.5 h-3.5" />,
  hybrid: <Globe className="w-3.5 h-3.5" />,
};

const typeBadgeColors: Record<string, string> = {
  virtual: "bg-blue-500/20 text-blue-500",
  in_person: "bg-amber-500/20 text-amber-500",
  hybrid: "bg-primary/20 text-primary",
};

function EventAnalyticsPanel({ event }: { event: EventRow }) {
  const { data: tickets } = useEventTickets(event.id);
  const checkedIn = tickets?.filter(t => t.status === "used").length || 0;
  const totalRevenue = tickets?.reduce((sum, t) => sum + t.amount_paid, 0) || 0;
  const platformFee = tickets?.reduce((sum, t) => sum + t.platform_fee, 0) || 0;
  const creatorEarnings = tickets?.reduce((sum, t) => sum + t.creator_earnings, 0) || 0;

  const { data: attendeeProfiles } = useQuery({
    queryKey: ["event-attendee-profiles-analytics", event.id],
    enabled: !!tickets?.length,
    queryFn: async () => {
      const ids = tickets!.map(t => t.buyer_id);
      const { data } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", ids);
      return data || [];
    },
  });

  const { data: waitlistCount } = useQuery({
    queryKey: ["event-waitlist-count", event.id],
    queryFn: async () => {
      const { count } = await supabase.from("event_waitlist").select("*", { count: "exact", head: true }).eq("event_id", event.id);
      return count || 0;
    },
  });

  function exportCSV() {
    if (!tickets?.length) return;
    const rows = [["Name", "Email", "Purchase Date", "Amount Paid", "Status", "Checked In"]];
    tickets.forEach(t => {
      const profile = attendeeProfiles?.find(p => p.user_id === t.buyer_id);
      rows.push([
        profile?.display_name || profile?.username || "—",
        "",
        format(new Date(t.created_at), "yyyy-MM-dd HH:mm"),
        `$${t.amount_paid.toFixed(2)}`,
        t.status,
        t.checked_in_at ? format(new Date(t.checked_in_at), "yyyy-MM-dd HH:mm") : "No",
      ]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title}-attendees.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isInPerson = event.event_type === "in_person" || event.event_type === "hybrid";
  const checkInRate = tickets?.length ? Math.round((checkedIn / tickets.length) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
      <div className="mt-3 p-4 bg-secondary/30 rounded-xl border border-border space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Tickets Sold</p>
            <p className="text-lg font-bold text-foreground">{event.tickets_sold}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Revenue</p>
            <p className="text-lg font-bold text-primary">${totalRevenue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Platform Fee</p>
            <p className="text-lg font-bold text-muted-foreground">${platformFee.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Your Earnings</p>
            <p className="text-lg font-bold text-foreground">${creatorEarnings.toFixed(2)}</p>
          </div>
        </div>
        {isInPerson && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Check-in Rate</p>
            <p className="text-lg font-bold text-foreground">{checkInRate}%</p>
          </div>
        )}
        {(waitlistCount ?? 0) > 0 && (
          <p className="text-xs text-muted-foreground text-center">Waitlist: {waitlistCount} people</p>
        )}

        {/* Attendee list */}
        {tickets && tickets.length > 0 && (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {tickets.map(t => {
              const profile = attendeeProfiles?.find(p => p.user_id === t.buyer_id);
              return (
                <div key={t.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    {profile?.avatar_url && <img src={profile.avatar_url} alt={profile.display_name || profile.username || ""} className="w-5 h-5 rounded-full" loading="lazy" />}
                    <span className="text-foreground">{profile?.display_name || profile?.username || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">${t.amount_paid.toFixed(2)}</span>
                    {t.status === "used" ? (
                      <span className="text-primary text-[10px]">✓ In</span>
                    ) : (
                      <span className="text-muted-foreground text-[10px]">{t.status}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button variant="outline" size="sm" onClick={exportCSV} className="w-full gap-2" disabled={!tickets?.length}>
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
      </div>
    </motion.div>
  );
}

function EventCard({ event, username }: { event: EventRow; username?: string }) {
  const navigate = useNavigate();
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const [showPromoters, setShowPromoters] = useState(false);
  const isPast = isBefore(new Date(event.ends_at), new Date());
  const isInPerson = event.event_type === "in_person" || event.event_type === "hybrid";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl overflow-hidden"
      >
        <div
          className="cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => event.slug && username ? navigate(`/${username}/events/${event.slug}`) : undefined}
        >
          {event.cover_image_url && (
            <div className="aspect-video w-full overflow-hidden">
              <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={statusColors[event.status]}>{event.status}</Badge>
              <Badge variant="outline" className={typeBadgeColors[event.event_type]}>
                {typeIcons[event.event_type]}
                <span className="ml-1 capitalize">{event.event_type.replace("_", " ")}</span>
              </Badge>
            </div>
            <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
            <p className="text-sm text-primary">{format(new Date(event.starts_at), "EEE MMM d · h:mm a")}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Ticket className="w-3.5 h-3.5" />
                {event.tickets_sold} sold{event.ticket_quantity ? ` / ${event.ticket_quantity}` : ""}
              </span>
              <span>{event.is_free ? "FREE" : `$${event.ticket_price}`}</span>
            </div>
          </div>
        </div>

        {/* Creator actions */}
        <div className="px-4 pb-3 flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setShowAnalytics(!showAnalytics)}>
            <BarChart3 className="w-3 h-3" /> {showAnalytics ? "Hide" : "Analytics"}
          </Button>
          {isInPerson && event.status === "published" && !isPast && (
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setShowCheckIn(true)}>
              <Users className="w-3 h-3" /> Check In
            </Button>
          )}
          {event.status === "published" && !isPast && (
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => navigate(`/scan/${event.id}`)}>
              <ScanLine className="w-3 h-3" /> Scan
            </Button>
          )}
          {event.status === "published" && (
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => navigate(`/events/${event.id}/live`)}>
              <Activity className="w-3 h-3" /> Live
            </Button>
          )}
          {!isPast && (
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setShowStaff((s) => !s)}>
              <ShieldCheck className="w-3 h-3" /> Staff
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setShowPromoters((s) => !s)}>
            <Megaphone className="w-3 h-3" /> Promoters
          </Button>
          {event.status === "published" && !isPast && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1 text-destructive border-destructive/30"
              onClick={async () => {
                if (!confirm("Cancel this event? All ticket holders will be refunded.")) return;
                await supabase.functions.invoke("cancel-event", { body: { event_id: event.id } });
                window.location.reload();
              }}
            >
              Cancel Event
            </Button>
          )}
        </div>

        {showAnalytics && <EventAnalyticsPanel event={event} />}
        {showStaff && (
          <div className="px-4 pb-4 pt-1 border-t border-border">
            <EventStaffManager eventId={event.id} />
          </div>
        )}
        {showPromoters && (
          <div className="px-4 pb-4 pt-1 border-t border-border">
            <EventPromotersManager
              eventId={event.id}
              eventUrl={`${window.location.origin}/events/${event.slug || event.id}`}
            />
          </div>
        )}
      </motion.div>

      {showCheckIn && <EventCheckIn event={event} onClose={() => setShowCheckIn(false)} />}
    </>
  );
}

export default function Events() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: events, isLoading, isError, refetch } = useCreatorEvents();
  const { data: dbProfile } = useQuery({
    queryKey: ["my-profile-username"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("username").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  return (
    <AppLayout>
      <PageHero
        eyebrow="Events"
        title="Events"
        subtitle="Create events, sell tickets, and engage your community — online and in person."
        actions={
          <Button onClick={() => navigate("/events/create")} className="gap-2">
            <Plus className="w-4 h-4" /> Create Event
          </Button>
        }
      />
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <Tabs defaultValue="mine" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="mine">My Events</TabsTrigger>
            <TabsTrigger value="worldwide">Worldwide</TabsTrigger>
          </TabsList>

          <TabsContent value="mine">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
              </div>
            ) : isError ? (
              <QueryErrorState
                message="We couldn't load your events right now. Check your connection and try again."
                onRetry={() => refetch()}
              />
            ) : !events?.length ? (
              <EmptyState
                icon={CalendarDays}
                title="No events yet"
                description="Create your first event to sell tickets and engage your community."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map(e => <EventCard key={e.id} event={e} username={dbProfile?.username || undefined} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="worldwide">
            <WorldwideEventsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
