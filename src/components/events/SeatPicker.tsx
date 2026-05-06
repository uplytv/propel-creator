import { useEffect, useMemo, useRef, useState } from "react";
import { Info, Loader2, Minus, Plus, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

interface SeatPickerProps {
  eventId: string;
  rows: number;
  cols: number;
  pricePerSeat: number;
  maxSeats?: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedSeats: string[]) => void;
}

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const seatLabel = (r: number, c: number) =>
  `${r < 26 ? ALPHA[r] : `R${r + 1}`}${c + 1}`;

export default function SeatPicker({
  eventId, rows, cols, pricePerSeat,
  maxSeats = 10, isOpen, onClose, onConfirm,
}: SeatPickerProps) {
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  // Zoom: 1 = fit, 2 = 2x, 3 = 3x. Larger maps default to a more zoomed-out fit.
  const [zoom, setZoom] = useState(1);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState<string | null>(null);
  const seatRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelected([]);
    setLoading(true);
    (async () => {
      const { data } = await (supabase as any)
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
    if (taken.has(label)) return;
    setSelected(prev =>
      prev.includes(label)
        ? prev.filter(s => s !== label)
        : prev.length >= maxSeats ? prev : [...prev, label],
    );
  };

  const subtotal = selected.length * pricePerSeat;

  const availableCount = totalSeats - taken.size;

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
                className="w-9 h-9 flex items-center justify-center disabled:opacity-30 hover:bg-muted rounded-b-lg border-t border-border"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          )}

          <div
            className="px-4 py-4 max-h-[60vh] overflow-auto overscroll-contain touch-pan-x touch-pan-y"
            style={{ WebkitOverflowScrolling: "touch" }}
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
                  const isTaken = taken.has(label);
                  const isPicked = selected.includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-label={`Seat ${label}${isTaken ? " (taken)" : isPicked ? " (selected)" : ""}`}
                      aria-pressed={isPicked}
                      disabled={isTaken}
                      onClick={() => toggle(label)}
                      style={{
                        fontSize: zoom >= 2 ? 11 : 9,
                      }}
                      className={[
                        "aspect-square rounded-md font-semibold transition-all",
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
