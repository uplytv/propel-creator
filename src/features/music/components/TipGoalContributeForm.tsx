import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, Loader2 } from "lucide-react";
import { useContributeToGoal, type TipGoal } from "../hooks/useTipGoals";

interface Props {
  goal: TipGoal;
}

const PRESETS = [5, 10, 25, 50];

export function TipGoalContributeForm({ goal }: Props) {
  const [amount, setAmount] = useState<number>(10);
  const [message, setMessage] = useState("");
  const [anon, setAnon] = useState(false);
  const contribute = useContributeToGoal();

  const disabled = goal.status === "closed" || goal.status === "draft";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((v) => (
          <Button
            key={v}
            type="button"
            variant={amount === v ? "default" : "outline"}
            className="min-h-[44px]"
            onClick={() => setAmount(v)}
          >
            ${v}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">$</span>
        <Input
          type="number"
          min={1}
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 0))}
          className="text-base"
        />
      </div>

      <Textarea
        placeholder="Add a message (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={280}
        className="text-base"
      />

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={anon} onCheckedChange={(v) => setAnon(!!v)} />
        Contribute anonymously
      </label>

      <Button
        className="w-full min-h-[44px]"
        disabled={disabled || contribute.isPending || amount <= 0}
        onClick={() =>
          contribute.mutate({
            goal_id: goal.id,
            amount_cents: amount * 100,
            message: message.trim() || undefined,
            is_anonymous: anon,
          })
        }
      >
        {contribute.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Heart className="w-4 h-4 mr-2" />
        )}
        Tip ${amount}
      </Button>
    </div>
  );
}
