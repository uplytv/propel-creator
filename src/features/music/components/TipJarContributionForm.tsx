import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useContributeToTipJar } from "../hooks/useTipJarGoals";

const PRESETS = [200, 500, 1000, 2500];

export function TipJarContributionForm({ goalId, disabled }: { goalId: string; disabled?: boolean }) {
  const contribute = useContributeToTipJar();
  const [amount, setAmount] = useState<number>(500);
  const [message, setMessage] = useState("");
  const [anon, setAnon] = useState(false);

  if (disabled) {
    return (
      <div className="rounded-xl border border-border bg-card/40 p-4 text-sm text-muted-foreground">
        This goal is no longer accepting contributions.
      </div>
    );
  }

  return (
    <form
      className="rounded-xl border border-border bg-card/40 p-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (amount < 100) {
          toast({ title: "Minimum $1.00", variant: "destructive" });
          return;
        }
        contribute.mutate(
          { goal_id: goalId, amount_cents: amount, message: message || undefined, is_anonymous: anon },
          {
            onSuccess: () => {
              toast({ title: "Thanks for chipping in!" });
              setMessage("");
            },
            onError: (err: any) =>
              toast({ title: "Could not contribute", description: err.message, variant: "destructive" }),
          },
        );
      }}
    >
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => setAmount(p)}
            className={`min-h-[44px] px-3 rounded-lg border text-sm font-semibold ${
              amount === p ? "border-primary bg-primary/10 text-primary" : "border-border bg-card/40"
            }`}
          >
            ${(p / 100).toFixed(0)}
          </button>
        ))}
      </div>
      <div className="space-y-1">
        <Label htmlFor="tj-amount">Custom amount (USD)</Label>
        <Input
          id="tj-amount"
          type="number"
          inputMode="decimal"
          min={1}
          step={1}
          value={(amount / 100).toString()}
          onChange={(e) => setAmount(Math.round(Number(e.target.value || 0) * 100))}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="tj-msg">Message (optional)</Label>
        <Textarea
          id="tj-msg"
          value={message}
          maxLength={280}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Cheering you on!"
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="tj-anon" className="text-sm">Contribute anonymously</Label>
        <Switch id="tj-anon" checked={anon} onCheckedChange={setAnon} />
      </div>
      <Button type="submit" className="w-full" disabled={contribute.isPending}>
        {contribute.isPending ? "Sending..." : `Contribute $${(amount / 100).toFixed(2)}`}
      </Button>
    </form>
  );
}
