import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Inbox,
  Loader2,
  Search,
  Building2,
  ExternalLink,
} from "lucide-react";

type Status = "new" | "contacted" | "confirmed" | "declined" | "archived";

interface Inquiry {
  id: string;
  artist_slug: string;
  contact_name: string;
  contact_email: string;
  contact_org: string | null;
  event_type: string | null;
  event_city: string | null;
  event_date: string | null;
  budget_usd: number | null;
  lineup: string | null;
  message: string | null;
  status: Status;
  source: string | null;
  created_at: string;
}

const STATUS_META: Record<Status, { label: string; bg: string; fg: string }> = {
  new: { label: "New", bg: "bg-[#00FF85]/15", fg: "text-[#00FF85]" },
  contacted: { label: "Contacted", bg: "bg-amber-400/15", fg: "text-amber-300" },
  confirmed: { label: "Confirmed", bg: "bg-emerald-400/15", fg: "text-emerald-300" },
  declined: { label: "Declined", bg: "bg-rose-500/15", fg: "text-rose-300" },
  archived: { label: "Archived", bg: "bg-white/10", fg: "text-white/60" },
};

const STATUS_ORDER: Status[] = ["new", "contacted", "confirmed", "declined", "archived"];

export default function AdminBookingInquiries() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [q, setQ] = useState("");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    document.title = "Booking Inquiries — UPLY Admin";
  }, []);

  // Admin gate
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    (async () => {
      const { data, error } = await (supabase as any).rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (error) setIsAdmin(false);
      else setIsAdmin(!!data);
    })();
  }, [user, authLoading]);

  // Load inquiries
  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("public_booking_inquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) setError(error.message);
    else setItems((data || []) as Inquiry[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  // Realtime
  useEffect(() => {
    if (!isAdmin) return;
    const ch = supabase
      .channel("admin-booking-inquiries")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "public_booking_inquiries" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [isAdmin]);

  const updateStatus = async (id: string, status: Status) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    const { error } = await (supabase as any)
      .from("public_booking_inquiries")
      .update({ status })
      .eq("id", id);
    if (error) {
      setError(error.message);
      load();
    }
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((i) => {
      if (filter !== "all" && i.status !== filter) return false;
      if (!term) return true;
      const hay = [
        i.contact_name,
        i.contact_email,
        i.contact_org,
        i.event_city,
        i.event_type,
        i.lineup,
        i.message,
        i.artist_slug,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [items, filter, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_ORDER.forEach((s) => (c[s] = 0));
    items.forEach((i) => (c[i.status] = (c[i.status] || 0) + 1));
    return c;
  }, [items]);

  // ── Loading / gating ───────────────────────────────────
  if (authLoading || isAdmin === null) {
    return <FullCenter><Loader2 className="h-6 w-6 animate-spin text-[#00FF85]" /></FullCenter>;
  }
  if (!user) {
    return (
      <FullCenter>
        <div className="text-center max-w-md">
          <h1 className="font-heading text-2xl font-bold">Sign in required</h1>
          <p className="mt-2 text-sm text-white/60">
            This is the UPLY admin booking inbox. Sign in with an admin account to continue.
          </p>
          <Link to="/login" className="mt-5 inline-flex rounded-full bg-[#00FF85] text-black px-4 py-2 text-sm font-bold">
            Sign in
          </Link>
        </div>
      </FullCenter>
    );
  }
  if (!isAdmin) {
    return (
      <FullCenter>
        <div className="text-center max-w-md">
          <h1 className="font-heading text-2xl font-bold">Admins only</h1>
          <p className="mt-2 text-sm text-white/60">
            Your account doesn't have admin access. Ask the platform owner to add the
            <code className="mx-1 px-1.5 py-0.5 rounded bg-white/10 text-xs">admin</code>
            role to your user.
          </p>
          <Link to="/" className="mt-5 inline-flex text-xs text-white/60 underline">Back to site</Link>
        </div>
      </FullCenter>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white mobile-safe-content">
      {/* Header */}
      <div className="border-b border-white/5 bg-black/60 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-5 py-4 flex items-center gap-3">
          <Link to="/" className="h-9 w-9 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#00FF85]">UPLY · Admin CRM</div>
            <h1 className="font-heading text-xl font-bold leading-tight">Booking Inquiries</h1>
          </div>
          <div className="text-xs text-white/50 hidden sm:block">
            {items.length} total · live
          </div>
        </div>

        {/* Tabs + search */}
        <div className="mx-auto max-w-7xl px-5 pb-4 flex flex-wrap gap-2 items-center">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={counts.all} />
          {STATUS_ORDER.map((s) => (
            <FilterChip
              key={s}
              active={filter === s}
              onClick={() => setFilter(s)}
              label={STATUS_META[s].label}
              count={counts[s] || 0}
              dot={STATUS_META[s].fg}
            />
          ))}
          <div className="ml-auto relative flex-1 sm:flex-none sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, city, lineup…"
              className="w-full pl-9 pr-3 py-2 rounded-full bg-white/[0.04] border border-white/10 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#00FF85]/40"
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-5 py-6">
        {error && (
          <div className="mb-4 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2">
            {error}
          </div>
        )}

        {loading ? (
          <FullCenter><Loader2 className="h-6 w-6 animate-spin text-[#00FF85]" /></FullCenter>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Inbox className="h-10 w-10 text-white/30 mx-auto" />
            <p className="mt-4 text-sm text-white/50">No inquiries yet. They'll show up here in real time as they land.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((i) => (
              <InquiryCard key={i.id} item={i} onStatus={(s) => updateStatus(i.id, s)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FullCenter({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-5">{children}</div>;
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold border transition min-h-[36px] ${
        active
          ? "bg-[#00FF85] text-black border-[#00FF85]"
          : "bg-white/[0.04] text-white/70 border-white/10 hover:bg-white/[0.08]"
      }`}
    >
      {dot && !active && <span className={`h-1.5 w-1.5 rounded-full bg-current ${dot}`} />}
      {label}
      <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${active ? "bg-black/15" : "bg-white/10"}`}>{count}</span>
    </button>
  );
}

function InquiryCard({ item, onStatus }: { item: Inquiry; onStatus: (s: Status) => void }) {
  const meta = STATUS_META[item.status];
  const created = new Date(item.created_at);
  const date = item.event_date ? new Date(item.event_date).toLocaleDateString() : null;
  const subject = `Re: Booking inquiry — ${item.event_city || item.event_type || "Arya XO"}`;
  const mailto = `mailto:${item.contact_email}?subject=${encodeURIComponent(subject)}`;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 hover:border-white/20 transition">
      <div className="flex flex-wrap items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.bg} ${meta.fg}`}>
              {meta.label}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-white/40">{item.artist_slug}</span>
            <span className="text-[11px] text-white/40">· {created.toLocaleString()}</span>
          </div>
          <div className="mt-1.5 font-heading text-lg font-bold truncate">{item.contact_name}</div>
          <div className="flex items-center gap-3 text-xs text-white/60 flex-wrap">
            <a href={mailto} className="inline-flex items-center gap-1 hover:text-white">
              <Mail className="h-3 w-3" /> {item.contact_email}
            </a>
            {item.contact_org && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {item.contact_org}
              </span>
            )}
          </div>
        </div>
        <a
          href={mailto}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#00FF85] text-black px-3 py-1.5 text-xs font-bold hover:brightness-110 min-h-[36px]"
        >
          Reply <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <Meta icon={MapPin} label="Location" value={item.event_city || "—"} />
        <Meta icon={Calendar} label="Date" value={date || "Flexible"} />
        <Meta icon={DollarSign} label="Budget" value={item.budget_usd ? `$${item.budget_usd.toLocaleString()}` : "—"} />
        <Meta icon={Users} label="Type" value={item.event_type || "—"} />
      </div>

      {item.lineup && (
        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-wider text-white/40">Lineup</div>
          <div className="text-sm text-white/80">{item.lineup}</div>
        </div>
      )}
      {item.message && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40">Notes</div>
          <div className="text-sm text-white/80 whitespace-pre-wrap">{item.message}</div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 pt-3 border-t border-white/5">
        <span className="text-[10px] uppercase tracking-wider text-white/40 self-center mr-1">Move to</span>
        {STATUS_ORDER.filter((s) => s !== item.status).map((s) => (
          <button
            key={s}
            onClick={() => onStatus(s)}
            className="text-[11px] rounded-full px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-white/70 hover:text-white min-h-[28px]"
          >
            {STATUS_META[s].label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Meta({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/30 border border-white/5 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1">
        <Icon className="h-3 w-3 text-[#00FF85]" /> {label}
      </div>
      <div className="text-sm font-semibold truncate">{value}</div>
    </div>
  );
}
