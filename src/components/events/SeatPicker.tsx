import { useEffect, useMemo, useRef, useState } from "react";
import { Info, Loader2, Minus, Plus, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SeatPickerProps {
  eventId: string;
  rows: number;
  cols: number;
  pricePerSeat: number;
  maxSeats?: number;
  blocked?: string[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedSeats: string[]) => void;
}

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const seatLabel = (r: number, c: number) =>
  `${r < 26 ? ALPHA[r] : `R${r + 1}`}${c + 1}`;

export default function SeatPicker({
  eventId, rows, cols, pricePerSeat,
  maxSeats = 10, blocked, isOpen, onClose, onConfirm,
}: SeatPickerProps) {
  const blockedSet = useMemo(() => new Set(blocked ?? []), [blocked]);
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  // Zoom: 1 = fit, up to 3x. Persisted per-event in localStorage.
  const zoomKey = `uply.seatPicker.zoom.${eventId}`;
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const raw = window.localStorage.getItem(zoomKey);
    const parsed = raw ? parseFloat(raw) : NaN;
    return Number.isFinite(parsed) ? Math.min(3, Math.max(1, parsed)) : 1;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(zoomKey, String(zoom)); } catch {}
  }, [zoom, zoomKey]);
  const scrollKey = `uply.seatPicker.scroll.${eventId}`;
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState<string | null>(null);
  const seatRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ dist: number; startZoom: number } | null>(null);
  const saveScrollTimer = useRef<number | null>(null);

  // Restore scroll once seats render after open
  useEffect(() => {
    if (!isOpen || loading || typeof window === "undefined") return;
    const el = scrollerRef.current;
    if (!el) return;
    const raw = window.localStorage.getItem(scrollKey);
    if (!raw) return;
    try {
      const { left, top } = JSON.parse(raw) as { left: number; top: number };
      // Defer to next frame so the grid has its final size
      requestAnimationFrame(() => {
        el.scrollTo({ left: left || 0, top: top || 0, behavior: "auto" });
      });
    } catch {}
  }, [isOpen, loading, scrollKey, zoom]);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || typeof window === "undefined") return;
    if (saveScrollTimer.current) window.clearTimeout(saveScrollTimer.current);
    saveScrollTimer.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          scrollKey,
          JSON.stringify({ left: el.scrollLeft, top: el.scrollTop }),
        );
      } catch {}
    }, 150);
  };

  useEffect(() => {
    if (!isOpen) return;
    setSelected([]);
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("tickets")
        .select("seat_label")
        .eq("event_id", eventId)
        .in("status", ["active", "scanned", "used", "listed_for_resale"])
        .not("seat_label", "is", null);
      setTaken(new Set((data ?? []).map((t: any) => t.seat_label).filter(Boolean)));
      setLoading(false);
    })();
  }, [isOpen, eventId]);

  const totalSeats = rows * cols;
  const allSeats = useMemo(
    () => Array.from({ length: totalSeats }, (_, i) => seatLabel(Math.floor(i / cols), i % cols)),
    [rows, cols, totalSeats],
  );

  const toggle = (label: string) => {
    if (taken.has(label) || blockedSet.has(label)) return;
    setSelected(prev =>
      prev.includes(label)
        ? prev.filter(s => s !== label)
        : prev.length >= maxSeats ? prev : [...prev, label],
    );
  };

  const subtotal = selected.length * pricePerSeat;

  const availableCount = totalSeats - taken.size - blockedSet.size;

  const rowLetters = useMemo(
    () => Array.from({ length: Math.min(rows, 26) }, (_, i) => ALPHA[i]),
    [rows],
  );

  const normalizedQuery = query.trim().toUpperCase();
  const matchesQuery = (label: string) => {
    if (!normalizedQuery) return true;
    return label.startsWith(normalizedQuery) || label.includes(normalizedQuery);
  };

  const scrollToSeat = (label: string) => {
    const el = seatRefs.current.get(label);
    const scroller = scrollerRef.current;
    if (!el || !scroller) return;
    const er = el.getBoundingClientRect();
    const sr = scroller.getBoundingClientRect();
    scroller.scrollBy({
      left: er.left - sr.left - sr.width / 2 + er.width / 2,
      top: er.top - sr.top - sr.height / 2 + er.height / 2,
      behavior: "smooth",
    });
    setHighlight(label);
    window.setTimeout(() => setHighlight((h) => (h === label ? null : h)), 1600);
  };

  const jumpToRow = (letter: string) => {
    setQuery(letter);
    scrollToSeat(`${letter}1`);
  };

  const submitSearch = () => {
    if (!normalizedQuery) return;
    // Try exact label first, else first matching label
    const exact = allSeats.find((s) => s === normalizedQuery);
    const target = exact ?? allSeats.find(matchesQuery);
    if (target) scrollToSeat(target);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 bg-card border-border">
        <DialogHeader className="px-4 py-3 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-base">Pick your seats</DialogTitle>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="How seat labels work"
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[260px] text-xs leading-relaxed">
                  <p className="font-semibold mb-1">How seats are labeled</p>
                  <p>
                    <span className="font-medium">Rows</span> use letters (A is closest to the
                    stage), <span className="font-medium">columns</span> use numbers from left to
                    right. Example: <span className="font-mono">B5</span> = Row B, Seat 5.
                  </p>
                  <p className="mt-2">Tap a seat to select up to {maxSeats}.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        {/* Search + row quick filters */}
        {!loading && rows > 0 && (
          <div className="px-4 pt-3 pb-2 border-b border-border space-y-2 bg-card">
            <form
              onSubmit={(e) => { e.preventDefault(); submitSearch(); }}
              className="relative"
            >
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find seat (e.g. B5) or row (e.g. C)"
                className="pl-9 pr-9 h-10 text-base"
                inputMode="text"
                autoComplete="off"
                aria-label="Search seats"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setHighlight(null); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>
            {rowLetters.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-thin">
                {rowLetters.map((r) => {
                  const active = normalizedQuery === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => jumpToRow(r)}
                      className={[
                        "shrink-0 min-w-[36px] h-8 px-2 rounded-full text-xs font-semibold border transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/30 text-muted-foreground border-border hover:bg-muted",
                      ].join(" ")}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="relative">
          {/* Zoom controls */}
          {!loading && cols > 8 && (
            <div className="absolute right-3 top-3 z-10 flex flex-col gap-1 bg-card/90 backdrop-blur border border-border rounded-lg shadow-md">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 1))}
                disabled={zoom >= 3}
                aria-label="Zoom in"
                className="w-9 h-9 flex items-center justify-center disabled:opacity-30 hover:bg-muted rounded-t-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, z - 1))}
                disabled={zoom <= 1}
                aria-label="Zoom out"
                className="w-9 h-9 flex items-center justify-center disabled:opacity-30 hover:bg-muted border-t border-border"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    setZoom(1);
                    const el = scrollerRef.current;
                    if (el) {
                      requestAnimationFrame(() => el.scrollTo({ left: 0, top: 0, behavior: "smooth" }));
                    }
                    if (typeof window !== "undefined") {
                      window.localStorage.removeItem(scrollKey);
                      window.localStorage.removeItem(zoomKey);
                    }
                    toast.success("View reset", { description: "Zoom and scroll cleared." });
                  } catch (err) {
                    toast.error("Couldn't reset view", {
                      description: "Storage access may be blocked. Try again or check your browser settings.",
                    });
                  }
                }}
                disabled={zoom === 1 && (scrollerRef.current?.scrollLeft ?? 0) === 0 && (scrollerRef.current?.scrollTop ?? 0) === 0}
                aria-label="Reset view"
                title="Reset view"
                className="w-9 h-9 flex items-center justify-center text-[10px] font-semibold disabled:opacity-30 hover:bg-muted rounded-b-lg border-t border-border"
              >
                Reset
              </button>
            </div>
          )}

          <div
            ref={scrollerRef}
            className="px-4 py-4 max-h-[60vh] overflow-auto overscroll-contain"
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x pan-y pinch-zoom" }}
            onScroll={handleScroll}
            onTouchStart={(e) => {
              if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                pinchRef.current = { dist: Math.hypot(dx, dy), startZoom: zoom };
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 2 && pinchRef.current) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const newDist = Math.hypot(dx, dy);
                const ratio = newDist / pinchRef.current.dist;
                const next = Math.min(3, Math.max(1, pinchRef.current.startZoom * ratio));
                setZoom(next);
              }
            }}
            onTouchEnd={(e) => {
              if (e.touches.length < 2) pinchRef.current = null;
            }}
          >
            <div className="text-[10px] uppercase tracking-wider text-center text-muted-foreground mb-1 sticky top-0">
              ── Stage / Screen ──
            </div>
            {!loading && (
              <p className="text-center text-[11px] text-muted-foreground mb-3">
                <span className="text-foreground font-semibold">{availableCount}</span> of {totalSeats} seats available
                {cols > 8 && <span className="ml-1 opacity-70">· pinch or scroll to navigate</span>}
              </p>
            )}

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div
                className="grid gap-1.5 mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${cols}, ${Math.max(22, 22 * zoom)}px)`,
                  width: "max-content",
                  minWidth: "100%",
                }}
                role="grid"
                aria-label="Seat map"
              >
                {allSeats.map((label) => {
                  const isTaken = taken.has(label) || blockedSet.has(label);
                  const isPicked = selected.includes(label);
                  const isMatch = matchesQuery(label);
                  const isHighlight = highlight === label;
                  return (
                    <button
                      key={label}
                      ref={(el) => {
                        if (el) seatRefs.current.set(label, el);
                        else seatRefs.current.delete(label);
                      }}
                      type="button"
                      aria-label={`Seat ${label}${isTaken ? " (taken)" : isPicked ? " (selected)" : ""}`}
                      aria-pressed={isPicked}
                      disabled={isTaken}
                      onClick={() => toggle(label)}
                      style={{ fontSize: zoom >= 2 ? 11 : 9 }}
                      className={[
                        "aspect-square rounded-md font-semibold transition-all",
                        isMatch ? "" : "opacity-25",
                        isHighlight ? "ring-2 ring-primary ring-offset-1 ring-offset-card animate-pulse" : "",
                        isTaken
                          ? "bg-muted/40 text-muted-foreground/40 cursor-not-allowed line-through"
                          : isPicked
                            ? "bg-primary text-primary-foreground scale-105 shadow-[0_0_0_2px_hsl(var(--primary))]"
                            : "bg-primary/15 text-foreground hover:bg-primary/30 active:bg-primary/40",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>


        {/* Persistent legend (always visible, outside scroll area) */}
        <div className="border-t border-border bg-card/80 backdrop-blur px-4 py-2.5 flex items-center justify-center flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-primary/15 ring-1 ring-primary/30 inline-block" /> Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-primary inline-block shadow-[0_0_0_1.5px_hsl(var(--primary))]" /> Selected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-muted/40 inline-block" /> Taken
          </span>
        </div>

        <div className="border-t border-border p-4 flex items-center justify-between gap-3 bg-card">
          <div>
            <p className="text-[11px] text-muted-foreground">{selected.length} of {maxSeats} max</p>
            <p className="text-base font-bold text-foreground">
              {selected.length ? selected.join(", ") : "No seats picked"}
            </p>
          </div>
          <Button
            onClick={() => onConfirm(selected)}
            disabled={selected.length === 0}
            className="h-11 min-w-[140px]"
          >
            Continue · ${subtotal.toFixed(2)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
