import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Swords, Calendar } from "lucide-react";
import { useCastBattleVote, type BattleChoice, type SetlistBattle } from "../hooks/useSetlistBattles";

interface Props {
  battle: SetlistBattle;
  myChoice?: BattleChoice | null;
}

export function SetlistBattleCard({ battle, myChoice }: Props) {
  const cast = useCastBattleVote();
  const total = battle.votes_a + battle.votes_b;
  const pctA = total ? Math.round((battle.votes_a / total) * 100) : 50;
  const pctB = 100 - pctA;
  const locked = battle.status !== "open";

  const renderOption = (choice: BattleChoice, label: string, tracks: string[], pct: number, votes: number) => {
    const selected = myChoice === choice;
    return (
      <div className="space-y-2">
        <Button
          size="sm"
          variant={selected ? "default" : "outline"}
          className="w-full justify-between h-11"
          onClick={() => cast.mutate({ battle_id: battle.id, choice, current: myChoice ?? null })}
          disabled={cast.isPending || locked}
        >
          <span className="truncate">{label}</span>
          <span className="text-xs opacity-80">{pct}% · {votes}</span>
        </Button>
        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
          <div className="h-full bg-primary/70" style={{ width: `${pct}%` }} />
        </div>
        {tracks.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-0.5 pl-3 list-disc">
            {tracks.slice(0, 4).map((t, i) => (
              <li key={i} className="truncate">{t}</li>
            ))}
            {tracks.length > 4 && <li>+{tracks.length - 4} more</li>}
          </ul>
        )}
      </div>
    );
  };

  return (
    <Card className="p-4 space-y-4 bg-card/40 border-border/50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <Swords className="h-4 w-4 text-primary shrink-0" />
          <h3 className="font-semibold truncate">{battle.title}</h3>
        </div>
        <Badge variant="outline" className="capitalize shrink-0">{battle.status}</Badge>
      </div>

      {battle.show_date && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Calendar className="h-3 w-3" />
          {new Date(battle.show_date).toLocaleDateString()}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {renderOption("a", battle.option_a_label, battle.option_a_tracks, pctA, battle.votes_a)}
        {renderOption("b", battle.option_b_label, battle.option_b_tracks, pctB, battle.votes_b)}
      </div>

      <p className="text-xs text-muted-foreground text-center">{total} total votes</p>
    </Card>
  );
}
