import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SyncBrief } from "../hooks/useSyncLicensing";

export function SyncBriefCard({ brief, onClick }: { brief: SyncBrief; onClick?: () => void }) {
  const budget = brief.budget_cents != null ? `$${(brief.budget_cents / 100).toFixed(0)}` : "Open budget";
  return (
    <Card onClick={onClick} className="p-4 cursor-pointer hover:bg-accent/30 transition-colors border-border">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold truncate">{brief.project_name}</h3>
        <Badge variant="secondary" className="text-[10px] uppercase">{brief.project_type}</Badge>
      </div>
      {brief.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{brief.description}</p>
      )}
      <div className="flex flex-wrap gap-1 mt-2">
        {(brief.mood ?? []).slice(0, 3).map((m) => (
          <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
        ))}
        {(brief.genre ?? []).slice(0, 2).map((g) => (
          <Badge key={g} variant="outline" className="text-[10px]">{g}</Badge>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 text-xs">
        <span className="text-primary font-medium">{budget}</span>
        {brief.deadline && <span className="text-muted-foreground">Due {brief.deadline}</span>}
      </div>
    </Card>
  );
}
