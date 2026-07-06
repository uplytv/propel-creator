import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Kanban, List, Loader2, RefreshCw, Search, Users, Zap } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import SEOHead from "@/components/SEOHead";
import EmptyState from "@/components/ui/EmptyState";
import QueryErrorState from "@/components/ui/QueryErrorState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import ContactSheet from "@/components/crm/ContactSheet";
import ContactsTable from "@/components/crm/ContactsTable";
import KanbanBoard from "@/components/crm/KanbanBoard";
import PipelineSummary from "@/components/crm/PipelineSummary";
import { STAGES, stageConfig, type CrmContact, type CrmStage } from "@/components/crm/crmTypes";
import { useCrmContacts, useSyncCrmContacts } from "@/hooks/useCrm";
import { useAuth } from "@/context/AuthContext";

type StageFilter = "all" | CrmStage;
type ViewMode = "list" | "board";

export default function CRM() {
  const { user } = useAuth();
  const { data: contacts = [], isLoading, isError, refetch } = useCrmContacts();
  const syncContacts = useSyncCrmContacts();

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [view, setView] = useState<ViewMode>("list");
  const [selected, setSelected] = useState<CrmContact | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const lastSyncKey = `uply-crm-last-resync-${user?.id ?? "anon"}`;
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(() => {
    const raw = localStorage.getItem(lastSyncKey);
    return raw ? Number(raw) : null;
  });

  const resyncAll = () => {
    syncContacts.mutate(undefined, {
      onSuccess: () => {
        const now = Date.now();
        localStorage.setItem(lastSyncKey, String(now));
        setLastSyncAt(now);
      },
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (view === "list" && stageFilter !== "all" && c.stage !== stageFilter) return false;
      if (!q) return true;
      return (
        c.email.toLowerCase().includes(q) ||
        (c.name ?? "").toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [contacts, search, stageFilter, view]);

  // Keep the sheet's contact fresh after stage/note mutations refetch the list.
  const selectedContact = useMemo(
    () => (selected ? contacts.find((c) => c.id === selected.id) ?? selected : null),
    [contacts, selected],
  );

  const openContact = (contact: CrmContact) => {
    setSelected(contact);
    setSheetOpen(true);
  };

  return (
    <AppLayout>
      <SEOHead title="CRM" description="Every fan relationship in one place" />
      <div className="min-h-screen pb-24">
        <div className="px-4 pt-6 max-w-5xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">CRM</h1>
                <Badge
                  variant="outline"
                  className="bg-blue-500/10 text-blue-600 border-transparent text-[10px] px-1.5 py-0.5 gap-1"
                >
                  <Zap className="w-3 h-3" />
                  Auto-sync on
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                New members, subscribers, buyers, tickets, and bookings are added automatically
              </p>
            </div>
            <div className="text-right shrink-0">
              <Button
                onClick={resyncAll}
                disabled={syncContacts.isPending}
                size="sm"
                variant="outline"
                className="gap-1.5"
              >
                {syncContacts.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Re-sync all
              </Button>
              <p className="text-[11px] text-muted-foreground mt-1">
                {lastSyncAt
                  ? `Last full re-sync ${formatDistanceToNow(lastSyncAt, { addSuffix: true })}`
                  : "Backfills contacts from before auto-sync"}
              </p>
            </div>
          </div>

          {/* Pipeline summary */}
          <PipelineSummary contacts={contacts} />

          {/* Search + view toggle + stage filter chips */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, email, or tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <div className="flex border border-border" role="group" aria-label="View mode">
                <Button
                  variant={view === "list" ? "default" : "ghost"}
                  size="sm"
                  className="h-9 px-3 gap-1.5 text-xs rounded-none"
                  onClick={() => setView("list")}
                >
                  <List className="w-3.5 h-3.5" />
                  List
                </Button>
                <Button
                  variant={view === "board" ? "default" : "ghost"}
                  size="sm"
                  className="h-9 px-3 gap-1.5 text-xs rounded-none"
                  onClick={() => setView("board")}
                >
                  <Kanban className="w-3.5 h-3.5" />
                  Board
                </Button>
              </div>
              {view === "list" &&
                (["all", ...STAGES] as StageFilter[]).map((s) => (
                  <Button
                    key={s}
                    variant={stageFilter === s ? "default" : "outline"}
                    size="sm"
                    className="h-9 text-xs px-3"
                    onClick={() => setStageFilter(s)}
                  >
                    {s === "all" ? "All" : stageConfig[s].label}
                  </Button>
                ))}
            </div>
          </div>

          {/* Contacts */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : isError ? (
            <QueryErrorState
              title="Couldn't load contacts"
              message="Something went wrong loading your CRM. Check your connection and try again."
              onRetry={() => refetch()}
            />
          ) : contacts.length === 0 ? (
            <div className="border border-border bg-card">
              <EmptyState
                icon={Users}
                title="No contacts yet"
                description="New members, subscribers, buyers, ticket holders, and booking inquiries appear here automatically. Hit Re-sync all to backfill existing ones."
                actionLabel={syncContacts.isPending ? "Syncing..." : "Re-sync all"}
                onAction={resyncAll}
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="border border-border bg-card py-12 text-center">
              <p className="text-sm font-medium text-muted-foreground">No contacts match</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try a different search or stage filter</p>
            </div>
          ) : view === "board" ? (
            <KanbanBoard contacts={filtered} onSelect={openContact} />
          ) : (
            <>
              <ContactsTable contacts={filtered} onSelect={openContact} />
              <p className="text-xs text-muted-foreground text-right">
                {filtered.length} of {contacts.length} contact{contacts.length === 1 ? "" : "s"}
              </p>
            </>
          )}
        </div>
      </div>

      <ContactSheet contact={selectedContact} open={sheetOpen} onOpenChange={setSheetOpen} />
    </AppLayout>
  );
}
