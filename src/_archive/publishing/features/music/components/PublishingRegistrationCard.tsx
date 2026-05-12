import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PublishingRegistration } from "../hooks/usePublishing";

export function PublishingRegistrationCard({ reg }: { reg: PublishingRegistration }) {
  const variant = reg.status === "confirmed" ? "default" : reg.status === "pending" ? "secondary" : "outline";
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold">{reg.publisher_name || "Self-published"}</div>
        <Badge variant={variant as any}>{reg.status}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        {reg.isrc && <div>ISRC: <span className="text-foreground">{reg.isrc}</span></div>}
        {reg.upc && <div>UPC: <span className="text-foreground">{reg.upc}</span></div>}
        {reg.iswc && <div>ISWC: <span className="text-foreground">{reg.iswc}</span></div>}
        {reg.pro_name && <div>PRO: <span className="text-foreground">{reg.pro_name}</span></div>}
        {reg.pro_member_id && <div>Member: <span className="text-foreground">{reg.pro_member_id}</span></div>}
        {reg.writer_share != null && <div>Writer: <span className="text-foreground">{reg.writer_share}%</span></div>}
      </div>
      {reg.notes && <p className="text-xs text-muted-foreground">{reg.notes}</p>}
    </Card>
  );
}
