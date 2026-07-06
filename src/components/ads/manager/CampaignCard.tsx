import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Copy, Archive, Trash2 } from "lucide-react";
import { PLATFORM_BY_ID, centsToDollars } from "./platforms";
import type { AdCampaignRow, AdCampaignStatus } from "@/hooks/useAdCampaigns";

const STATUS_STYLES: Record<AdCampaignStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  published: "bg-primary/10 text-primary",
  paused: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  archived: "bg-muted text-muted-foreground line-through",
};

export default function CampaignCard({
  campaign,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  campaign: AdCampaignRow;
  onEdit: (c: AdCampaignRow) => void;
  onDuplicate: (c: AdCampaignRow) => void;
  onArchive: (c: AdCampaignRow) => void;
  onDelete: (c: AdCampaignRow) => void;
}) {
  const meta = PLATFORM_BY_ID[campaign.platform];
  const Icon = meta.icon;

  return (
    <Card className="p-4 flex items-center gap-4">
      <div
        className="w-9 h-9 flex items-center justify-center shrink-0"
        style={{ background: `${meta.color}1A`, color: meta.color }}
      >
        <Icon style={{ width: 18, height: 18 }} />
      </div>

      <button
        onClick={() => onEdit(campaign)}
        className="flex-1 min-w-0 text-left group"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
            {campaign.name}
          </span>
          <Badge variant="outline" className="text-[10px] font-medium capitalize">
            {meta.label}
          </Badge>
          <span
            className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              STATUS_STYLES[campaign.status]
            }`}
          >
            {campaign.status}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
          {campaign.objective || "No objective"} · {centsToDollars(campaign.budget_daily_cents)}/day
        </p>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(campaign)}>
            <Pencil className="w-4 h-4 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDuplicate(campaign)}>
            <Copy className="w-4 h-4 mr-2" /> Duplicate
          </DropdownMenuItem>
          {campaign.status !== "archived" && (
            <DropdownMenuItem onClick={() => onArchive(campaign)}>
              <Archive className="w-4 h-4 mr-2" /> Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => onDelete(campaign)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  );
}
