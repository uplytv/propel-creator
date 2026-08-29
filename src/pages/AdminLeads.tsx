import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Download, Inbox, RefreshCw, Mail, Phone } from "lucide-react";

const STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  contacted: "bg-warning/15 text-warning border-warning/30",
  qualified: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  won: "bg-primary/15 text-primary border-primary/30",
  lost: "bg-muted text-muted-foreground border-border",
};

interface LeadRow {
  id: string;
  business_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  status_updated_at: string | null;
}

interface Lead extends LeadRow {
  businessName: string;
  username: string | null;
}

export default function AdminLeads() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [business, setBusiness] = useState("all");
  const [range, setRange] = useState("all");
  const [sort, setSort] = useState("newest");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-leads"],
    queryFn: async (): Promise<Lead[]> => {
      const { data: leads, error } = await supabase
        .from("business_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      const rows = (leads || []) as unknown as LeadRow[];

      const ids = Array.from(new Set(rows.map((r) => r.business_id)));
      const nameMap = new Map<string, { businessName: string; username: string | null }>();
      if (ids.length) {
        const { data: biz } = await supabase
          .from("business_details")
          .select("id, business_name, profile_id")
          .in("id", ids);
        const profileIds = (biz || []).map((b: any) => b.profile_id).filter(Boolean);
        const { data: profs } = profileIds.length
          ? await supabase.from("profiles").select("id, username").in("id", profileIds)
          : { data: [] as any[] };
        const usernameById = new Map((profs || []).map((p: any) => [p.id, p.username]));
        (biz || []).forEach((b: any) => {
          nameMap.set(b.id, {
            businessName: b.business_name || "Unknown",
            username: usernameById.get(b.profile_id) ?? null,
          });
        });
      }

      return rows.map((r) => ({
        ...r,
        status: r.status || "new",
        businessName: nameMap.get(r.business_id)?.businessName || "Unknown",
        username: nameMap.get(r.business_id)?.username ?? null,
      }));
    },
  });

  const sources = useMemo(() => {
    const set = new Set<string>();
    (data || []).forEach((l) => l.source && set.add(l.source));
    return Array.from(set).sort();
  }, [data]);

  const businesses = useMemo(() => {
    const map = new Map<string, string>();
    (data || []).forEach((l) => map.set(l.business_id, l.businessName));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);

  const filtered = useMemo(() => {
    let rows = data || [];
    if (source !== "all") rows = rows.filter((r) => r.source === source);
    if (status !== "all") rows = rows.filter((r) => r.status === status);
    if (business !== "all") rows = rows.filter((r) => r.business_id === business);
    if (range !== "all") {
      const days = Number(range);
      const cutoff = Date.now() - days * 86400000;
      rows = rows.filter((r) => new Date(r.created_at).getTime() >= cutoff);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        [r.name, r.email, r.phone, r.message, r.businessName]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
    }
    return rows;
  }, [data, source, status, business, range, search]);

  const visible = useMemo(() => {
    const rows = [...filtered];
    const time = (r: Lead) => new Date(r.created_at).getTime();
    switch (sort) {
      case "oldest":
        return rows.sort((a, b) => time(a) - time(b));
      case "source":
        return rows.sort(
          (a, b) => (a.source || "").localeCompare(b.source || "") || time(b) - time(a),
        );
      case "status":
        return rows.sort((a, b) => a.status.localeCompare(b.status) || time(b) - time(a));
      case "business":
        return rows.sort(
          (a, b) => a.businessName.localeCompare(b.businessName) || time(b) - time(a),
        );
      default:
        return rows.sort((a, b) => time(b) - time(a));
    }
  }, [filtered, sort]);



  const stats = useMemo(() => {
    const rows = filtered;
    const by = (s: Status) => rows.filter((r) => r.status === s).length;
    return {
      total: rows.length,
      new: by("new"),
      contacted: by("contacted"),
      qualified: by("qualified"),
      won: by("won"),
      lost: by("lost"),
    };
  }, [filtered]);

  const updateStatus = async (id: string, next: string) => {
    const prev = qc.getQueryData<Lead[]>(["admin-leads"]);
    qc.setQueryData<Lead[]>(["admin-leads"], (old) =>
      (old || []).map((l) => (l.id === id ? { ...l, status: next } : l)),
    );
    const { error } = await supabase
      .from("business_leads")
      .update({ status: next } as never)
      .eq("id", id);
    if (error) {
      qc.setQueryData(["admin-leads"], prev);
      toast.error("Couldn't update status", { description: error.message });
    } else {
      toast.success(`Marked as ${next}`);
    }
  };

  const exportCsv = () => {
    const headers = [
      "created_at",
      "business",
      "username",
      "source",
      "status",
      "name",
      "email",
      "phone",
      "message",
    ];
    const csv = [
      headers.join(","),
      ...filtered.map((r) =>
        [
          r.created_at,
          r.businessName,
          r.username || "",
          r.source,
          r.status,
          r.name || "",
          r.email || "",
          r.phone || "",
          (r.message || "").replace(/\n/g, " "),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} leads`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 mobile-safe-content">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-heading font-bold">Leads</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every captured lead across profile, links, blog and community pages.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("w-4 h-4 mr-1.5", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Button size="sm" onClick={exportCsv} disabled={!filtered.length}>
              <Download className="w-4 h-4 mr-1.5" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Total", value: stats.total },
            { label: "New", value: stats.new },
            { label: "Contacted", value: stats.contacted },
            { label: "Qualified", value: stats.qualified },
            { label: "Won", value: stats.won },
            { label: "Lost", value: stats.lost },
          ].map((s) => (
            <Card key={s.label} className="bg-card border-border">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-heading font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search name, email, phone, message…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={business} onValueChange={setBusiness}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All pages</SelectItem>
              {businesses.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 flex flex-col items-center text-center gap-2">
              <Inbox className="w-8 h-8 text-muted-foreground" />
              <p className="font-heading font-semibold">No leads match these filters</p>
              <p className="text-sm text-muted-foreground">
                Try clearing the search or widening the date range.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((l) => (
              <Card key={l.id} className="bg-card border-border">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold truncate">{l.name || "Anonymous"}</span>
                      <Badge variant="outline" className={cn("text-[10px]", STATUS_STYLES[l.status])}>
                        {l.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {l.source}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{l.businessName}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {l.email && (
                        <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 hover:text-foreground">
                          <Mail className="w-3 h-3" /> {l.email}
                        </a>
                      )}
                      {l.phone && (
                        <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                          <Phone className="w-3 h-3" /> {l.phone}
                        </a>
                      )}
                      <span>{new Date(l.created_at).toLocaleString()}</span>
                    </div>
                    {l.message && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{l.message}</p>
                    )}
                  </div>
                  <Select value={l.status} onValueChange={(v) => updateStatus(l.id, v)}>
                    <SelectTrigger className="w-full md:w-[150px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
