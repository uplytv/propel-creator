import { STAGES, formatCents, stageConfig, type CrmContact } from "./crmTypes";

/** Four square stat tiles — one per pipeline stage, with deal-value sums. */
export default function PipelineSummary({ contacts }: { contacts: CrmContact[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {STAGES.map((stage) => {
        const cfg = stageConfig[stage];
        const inStage = contacts.filter((c) => c.stage === stage);
        const totalCents = inStage.reduce((sum, c) => sum + (c.value_cents ?? 0), 0);
        return (
          <div key={stage} className="border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className="text-xs text-muted-foreground">{cfg.label}</span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-2xl font-bold text-foreground tabular-nums">{inStage.length}</div>
              {totalCents > 0 && (
                <div className="text-xs text-muted-foreground tabular-nums">{formatCents(totalCents)}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
