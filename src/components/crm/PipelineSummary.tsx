import { STAGES, stageConfig, type CrmContact } from "./crmTypes";

/** Four square stat tiles — one per pipeline stage. */
export default function PipelineSummary({ contacts }: { contacts: CrmContact[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {STAGES.map((stage) => {
        const cfg = stageConfig[stage];
        const count = contacts.filter((c) => c.stage === stage).length;
        return (
          <div key={stage} className="border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className="text-xs text-muted-foreground">{cfg.label}</span>
            </div>
            <div className="text-2xl font-bold text-foreground tabular-nums">{count}</div>
          </div>
        );
      })}
    </div>
  );
}
