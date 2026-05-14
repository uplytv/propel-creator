import { useState } from "react";
import { Send, Loader2, Sparkles, Check, X } from "lucide-react";
import BackNav from "@/components/BackNav";
import { useAriaCommand, type AriaAction } from "../hooks/useAriaCommand";
import { Button } from "@/components/ui/button";

const EXAMPLES = [
  "Show my top 10 members by lifetime value",
  "What's my MRR this month vs last?",
  "Create a $19/mo Inner Circle tier with private streams",
  "Draft an email to active members about a new perk",
];

export default function AriaCommandPage() {
  const [input, setInput] = useState("");
  const { actions, loading, error, submit, approve, cancel } = useAriaCommand();

  const onSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    try { await submit(msg); } catch { /* surfaced via error */ }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-jakarta mobile-safe-content">
      <div className="px-4 pt-2">
        <BackNav fallback="/dashboard" label="Back" />
      </div>

      <header className="px-4 pt-2 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">ARIA Command</h1>
            <p className="text-xs text-white/50">
              Tell me what to do. I'll parse, confirm, and run it.
            </p>
          </div>
        </div>
      </header>

      <section className="px-4">
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Create a $19/mo VIP tier"
            rows={3}
            className="w-full bg-transparent text-base placeholder:text-white/30 resize-none outline-none"
            style={{ fontSize: 16 }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSend();
            }}
          />
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-white/40">⌘↵ to send</span>
            <Button
              onClick={() => onSend()}
              disabled={loading || !input.trim()}
              className="h-10 min-w-[44px] bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-3 text-sm text-red-400 px-1">{error}</div>
        )}

        {actions.length === 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs uppercase tracking-wide text-white/40 px-1">Try</p>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => onSend(ex)}
                className="w-full text-left text-sm bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 min-h-[44px]"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="px-4 mt-6 space-y-3">
        {actions.map((a) => (
          <ActionCard key={a.id} action={a} onApprove={approve} onCancel={cancel} />
        ))}
      </section>
    </div>
  );
}

function ActionCard({
  action,
  onApprove,
  onCancel,
}: {
  action: AriaAction;
  onApprove: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const isWritePending = action.requires_approval && action.status === "pending";
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-gradient-to-r from-blue-500/20 to-purple-600/20 text-white/80 border border-white/10">
              {action.intent || "unknown"}
            </span>
            <span className={`text-[10px] uppercase ${statusColor(action.status)}`}>
              {action.status}
            </span>
          </div>
          {action.summary && (
            <p className="mt-1.5 text-sm text-white/90">{action.summary}</p>
          )}
          {Object.keys(action.parsed_params || {}).length > 0 && (
            <pre className="mt-2 text-[11px] text-white/60 bg-black/30 rounded-lg p-2 overflow-x-auto">
{JSON.stringify(action.parsed_params, null, 2)}
            </pre>
          )}
        </div>
      </div>

      {isWritePending && (
        <div className="flex gap-2 mt-3">
          <Button
            onClick={() => onApprove(action.id)}
            className="flex-1 min-h-[44px] bg-[#00FF85] text-black hover:opacity-90"
          >
            <Check className="w-4 h-4 mr-1" /> Approve
          </Button>
          <Button
            onClick={() => onCancel(action.id)}
            variant="outline"
            className="flex-1 min-h-[44px] bg-transparent border-white/20"
          >
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
        </div>
      )}

      {action.status === "executed" && action.result && (
        <ResultView result={action.result} />
      )}
      {action.status === "failed" && action.error && (
        <p className="mt-2 text-xs text-red-400">{action.error}</p>
      )}
    </div>
  );
}

function statusColor(s: string) {
  switch (s) {
    case "executed": return "text-[#00FF85]";
    case "failed": return "text-red-400";
    case "cancelled": return "text-white/40";
    case "approved": return "text-blue-300";
    default: return "text-white/50";
  }
}

function ResultView({ result }: { result: any }) {
  if (!result) return null;
  if (result.type === "members") {
    return (
      <div className="mt-3 text-sm">
        <p className="text-white/60 mb-1.5">{result.rows?.length ?? 0} members</p>
        <div className="space-y-1">
          {result.rows?.slice(0, 10).map((r: any, i: number) => (
            <div key={i} className="flex justify-between text-xs bg-white/[0.02] rounded px-2 py-1.5">
              <span className="font-mono truncate">{r.member_id || r.user_id}</span>
              <span className="text-white/60">
                {r.ltv != null ? `$${r.ltv.toFixed(0)} LTV` : new Date(r.joined_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (result.type === "revenue") {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Stat label={`Current (${result.window})`} value={`$${result.current?.total?.toFixed(2) ?? 0}`} sub={`${result.current?.count ?? 0} subs`} />
        {result.previous && (
          <Stat label="Previous" value={`$${result.previous.total.toFixed(2)}`} sub={`${result.previous.count} subs`} />
        )}
      </div>
    );
  }
  if (result.type === "content") {
    return (
      <div className="mt-3 space-y-1.5">
        {result.rows?.slice(0, 10).map((r: any) => (
          <div key={r.id} className="text-xs bg-white/[0.02] rounded px-2 py-1.5">
            <p className="line-clamp-2">{r.content}</p>
            <p className="text-white/40 mt-0.5">{new Date(r.created_at).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    );
  }
  if (result.type === "tier_created") {
    return (
      <div className="mt-3 text-sm text-[#00FF85]">
        ✓ Tier created. ID: <span className="font-mono">{result.data?.tier?.id}</span>
      </div>
    );
  }
  if (result.type?.endsWith("_draft")) {
    return (
      <div className="mt-3 text-xs text-white/70 bg-black/30 rounded p-2">
        <p className="text-white/50 mb-1">Draft</p>
        {result.subject && <p className="font-medium text-white">{result.subject}</p>}
        <p className="whitespace-pre-wrap">{result.body}</p>
        {result.note && <p className="mt-1.5 text-white/40">{result.note}</p>}
      </div>
    );
  }
  return (
    <pre className="mt-2 text-[11px] text-white/60 bg-black/30 rounded p-2 overflow-x-auto">
{JSON.stringify(result, null, 2)}
    </pre>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
      <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
      <p className="text-lg font-semibold mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-white/40">{sub}</p>}
    </div>
  );
}
