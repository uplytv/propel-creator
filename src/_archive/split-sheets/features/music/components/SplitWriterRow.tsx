import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock } from "lucide-react";
import type { SplitWriter } from "../hooks/useSplitSheets";

export function SplitWriterRow({ writer }: { writer: SplitWriter }) {
  return (
    <Card className="p-3 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{writer.writer_name}</p>
          <Badge variant="secondary" className="capitalize">{writer.role}</Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {writer.pro_affiliation ?? "No PRO"} • {writer.writer_email ?? "no email"}
        </p>
      </div>
      <div className="text-right text-sm">
        <p>W: {writer.writing_share_pct}%</p>
        <p className="text-muted-foreground">P: {writer.publishing_share_pct}%</p>
      </div>
      {writer.signed_at ? (
        <CheckCircle2 className="w-5 h-5 text-primary" />
      ) : (
        <Clock className="w-5 h-5 text-muted-foreground" />
      )}
    </Card>
  );
}
