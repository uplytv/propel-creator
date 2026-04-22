import { useEffect, useRef, useState } from "react";
import {
  PREFETCH_TOGGLES_EVENT,
  getPrefetchToggles,
  getPrefetchTogglesChangedAt,
  importPrefetchToggles,
  PREFETCH_TARGETS,
  resetPrefetchToggles,
  setPrefetchToggle,
  validatePrefetchSnapshot,
} from "@/lib/devPrefetchToggles";

type PrefetchStatus =
  | "idle"
  | "deferred"
  | "skipped"
  | "running"
  | "success"
  | "late-success"
  | "timeout"
  | "aborted"
  | "failed";

type Entry = {
  target: "home" | "landing";
  status: PrefetchStatus;
  reason?: string;
  updatedAt: number;
  durationMs?: number;
};

type State = Record<"home" | "landing", Entry>;

const PREFETCH_STATUS_EVENT = "uply:prefetch_status";

const initial: State = {
  home: { target: "home", status: "idle", updatedAt: Date.now() },
  landing: { target: "landing", status: "idle", updatedAt: Date.now() },
};

const statusColor: Record<PrefetchStatus, string> = {
  idle: "bg-white/10 text-white/60",
  deferred: "bg-amber-500/20 text-amber-300",
  skipped: "bg-white/10 text-white/50",
  running: "bg-blue-500/20 text-blue-300 animate-pulse",
  success: "bg-emerald-500/20 text-emerald-300",
  "late-success": "bg-emerald-500/20 text-emerald-300",
  timeout: "bg-orange-500/20 text-orange-300",
  aborted: "bg-rose-500/20 text-rose-300",
  failed: "bg-red-500/20 text-red-300",
};

const formatRelative = (ts: number | null): string => {
  if (ts == null) return "never";
  const diff = Math.max(0, Date.now() - ts);
  if (diff < 1000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
};

const formatAbsolute = (ts: number | null): string | undefined => {
  if (ts == null) return undefined;
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return undefined;
  }
};

const downloadJson = (json: string, baseName: string) => {
  try {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .slice(0, 19);
    a.href = url;
    a.download = `${baseName}_${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // eslint-disable-next-line no-console
    console.error("[PrefetchDebugPanel] download failed");
  }
};

/**
 * Dev-only floating panel showing the live prefetch status for the home and
 * landing route bundles. Renders nothing in production.
 */
export const PrefetchDebugPanel = () => {
  const [state, setState] = useState<State>(initial);
  const [collapsed, setCollapsed] = useState(false);
  const [toggles, setToggles] = useState(() => getPrefetchToggles());
  const [changedAt, setChangedAt] = useState(() => getPrefetchTogglesChangedAt());
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [importStatus, setImportStatus] = useState<"idle" | "imported" | "error">("idle");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [validateStatus, setValidateStatus] = useState<"idle" | "pass" | "fail">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Tick once a second so the relative "changed Xs ago" label stays fresh.
  const [, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<Entry>).detail;
      if (!detail) return;
      setState((prev) => ({ ...prev, [detail.target]: detail }));
    };
    const onTogglesChange = (e: Event) => {
      const detail = (e as CustomEvent<{
        toggles: { home: boolean; landing: boolean };
        changedAt: { home: number | null; landing: number | null };
      }>).detail;
      if (!detail) return;
      setToggles(detail.toggles);
      setChangedAt(detail.changedAt);
    };
    window.addEventListener(PREFETCH_STATUS_EVENT, onEvent);
    window.addEventListener(PREFETCH_TOGGLES_EVENT, onTogglesChange);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.removeEventListener(PREFETCH_STATUS_EVENT, onEvent);
      window.removeEventListener(PREFETCH_TOGGLES_EVENT, onTogglesChange);
      window.clearInterval(tick);
    };
  }, []);

  if (!import.meta.env.DEV) return null;

  return (
    <div
      className="fixed bottom-3 right-3 z-[9999] rounded-lg border border-white/10 bg-black/80 backdrop-blur text-xs text-white shadow-lg font-mono select-none"
      style={{ maxWidth: 280 }}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 border-b border-white/10 hover:bg-white/5 rounded-t-lg"
      >
        <span className="font-semibold text-white/80">prefetch</span>
        <span className="text-white/40">{collapsed ? "▸" : "▾"}</span>
      </button>
      {!collapsed && (
        <div className="p-2 space-y-1.5">
          {(["home", "landing"] as const).map((target) => {
            const entry = state[target];
            const enabled = toggles[target];
            const lastChanged = changedAt[target];
            return (
              <div key={target} className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 w-14 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => {
                        setPrefetchToggle(target, e.target.checked);
                        setToggles(getPrefetchToggles());
                        setChangedAt(getPrefetchTogglesChangedAt());
                      }}
                      className="h-3 w-3 accent-emerald-400 cursor-pointer"
                    />
                    <span className={enabled ? "text-white/70" : "text-white/30 line-through"}>
                      {target}
                    </span>
                  </label>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide ${statusColor[entry.status]}`}
                  >
                    {entry.status}
                  </span>
                  {entry.durationMs != null && (
                    <span className="text-white/40 text-[10px]">
                      {entry.durationMs}ms
                    </span>
                  )}
                </div>
                <div
                  className="text-white/30 text-[10px] truncate pl-[68px]"
                  title={formatAbsolute(lastChanged) ?? "toggle never changed"}
                >
                  toggle: {formatRelative(lastChanged)}
                </div>
                {entry.reason && (
                  <div
                    className="text-white/40 text-[10px] truncate pl-[68px]"
                    title={entry.reason}
                  >
                    {entry.reason}
                  </div>
                )}
              </div>
            );
          })}
          {(() => {
            const buildSnapshot = () => ({
              capturedAt: new Date().toISOString(),
              status: state,
              toggles,
              togglesChangedAt: {
                home: changedAt.home ? new Date(changedAt.home).toISOString() : null,
                landing: changedAt.landing
                  ? new Date(changedAt.landing).toISOString()
                  : null,
              },
            });
            return (
              <div className="space-y-1.5 mt-1">
                <div className="flex gap-1.5">
                  <button
                    onClick={async () => {
                      const json = JSON.stringify(buildSnapshot(), null, 2);
                      try {
                        await navigator.clipboard.writeText(json);
                        setCopyStatus("copied");
                      } catch {
                        // eslint-disable-next-line no-console
                        console.log("[PrefetchDebugPanel] snapshot:\n" + json);
                        setCopyStatus("error");
                      }
                      window.setTimeout(() => setCopyStatus("idle"), 1500);
                    }}
                    className="flex-1 rounded border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wide text-white/60 hover:bg-white/5 hover:text-white/80 transition"
                  >
                    {copyStatus === "copied"
                      ? "copied ✓"
                      : copyStatus === "error"
                        ? "see console"
                        : "copy snapshot"}
                  </button>
                  <button
                    onClick={() => {
                      const json = JSON.stringify(buildSnapshot(), null, 2);
                      downloadJson(json, "prefetch-snapshot");
                    }}
                    className="flex-1 rounded border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wide text-white/60 hover:bg-white/5 hover:text-white/80 transition"
                  >
                    download
                  </button>
                </div>
                {(() => {
                  const buildExample = () => ({
                    capturedAt: new Date().toISOString(),
                    toggles: { home: true, landing: true },
                    togglesChangedAt: {
                      home: new Date().toISOString(),
                      landing: null as string | null,
                    },
                  });
                  return (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          downloadJson(
                            JSON.stringify(buildExample(), null, 2),
                            "prefetch-snapshot-example"
                          );
                        }}
                        className="flex-1 rounded border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wide text-white/60 hover:bg-white/5 hover:text-white/80 transition"
                      >
                        download example
                      </button>
                      <button
                        onClick={() => {
                          const result = validatePrefetchSnapshot(buildExample());
                          if (result.ok) {
                            setValidateStatus("pass");
                            setImportErrors([]);
                          } else {
                            setValidateStatus("fail");
                            setImportErrors((result as { ok: false; errors: string[] }).errors);
                          }
                          window.setTimeout(() => setValidateStatus("idle"), 2000);
                        }}
                        className={`flex-1 rounded border px-2 py-1 text-[10px] uppercase tracking-wide transition ${
                          validateStatus === "pass"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : validateStatus === "fail"
                              ? "border-red-500/40 bg-red-500/10 text-red-300"
                              : "border-white/10 text-white/60 hover:bg-white/5 hover:text-white/80"
                        }`}
                      >
                        {validateStatus === "pass"
                          ? "valid ✓"
                          : validateStatus === "fail"
                            ? "invalid ✗"
                            : "validate example"}
                      </button>
                    </div>
                  );
                })()}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    // Reset so re-selecting the same file fires onChange again.
                    e.target.value = "";
                    if (!file) return;
                    setImportErrors([]);
                    let parsed: unknown;
                    try {
                      const text = await file.text();
                      parsed = JSON.parse(text);
                    } catch (err) {
                      const msg =
                        err instanceof Error
                          ? `Invalid JSON: ${err.message}`
                          : "Invalid JSON file.";
                      // eslint-disable-next-line no-console
                      console.error("[PrefetchDebugPanel] import parse failed", err);
                      setImportErrors([msg]);
                      setImportStatus("error");
                      window.setTimeout(() => setImportStatus("idle"), 2000);
                      return;
                    }
                    const result = importPrefetchToggles(parsed);
                    if (!result.ok) {
                      const errs = (result as { ok: false; errors: string[] }).errors;
                      // eslint-disable-next-line no-console
                      console.error(
                        "[PrefetchDebugPanel] snapshot validation failed",
                        errs
                      );
                      setImportErrors(errs);
                      setImportStatus("error");
                      window.setTimeout(() => setImportStatus("idle"), 2000);
                      return;
                    }
                    setToggles(getPrefetchToggles());
                    setChangedAt(getPrefetchTogglesChangedAt());
                    setImportStatus("imported");
                    window.setTimeout(() => setImportStatus("idle"), 1500);
                  }}
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 rounded border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wide text-white/60 hover:bg-white/5 hover:text-white/80 transition"
                  >
                    {importStatus === "imported"
                      ? "imported ✓"
                      : importStatus === "error"
                        ? "invalid file"
                        : "import snapshot"}
                  </button>
                  <button
                    onClick={() => {
                      resetPrefetchToggles();
                      setToggles(getPrefetchToggles());
                      setChangedAt(getPrefetchTogglesChangedAt());
                      setImportErrors([]);
                    }}
                    className="flex-1 rounded border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wide text-white/60 hover:bg-white/5 hover:text-white/80 transition"
                  >
                    reset toggles
                  </button>
                </div>
                {importErrors.length > 0 && (
                  <div className="rounded border border-red-500/30 bg-red-500/10 p-1.5 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wide text-red-300 font-semibold">
                        import errors
                      </span>
                      <button
                        onClick={() => setImportErrors([])}
                        className="text-[10px] text-red-300/60 hover:text-red-300"
                      >
                        dismiss
                      </button>
                    </div>
                    <ul className="text-[10px] text-red-200/90 space-y-0.5 list-disc pl-3">
                      {importErrors.map((err, i) => (
                        <li key={i} className="break-words">
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default PrefetchDebugPanel;
