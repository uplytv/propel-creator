import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  useJoinMerchWaitlist,
  useLeaveMerchWaitlist,
  useMyMerchWaitlistSignup,
} from "../hooks/useMerchWaitlists";

interface Props {
  waitlistId: string;
  full?: boolean;
}

export function MerchWaitlistJoinForm({ waitlistId, full }: Props) {
  const { data: mine, isLoading } = useMyMerchWaitlistSignup(waitlistId);
  const join = useJoinMerchWaitlist();
  const leave = useLeaveMerchWaitlist();
  const [email, setEmail] = useState("");
  const [size, setSize] = useState("");

  if (isLoading) return null;

  if (mine) {
    return (
      <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
        <p className="text-sm">
          You're on the waitlist
          {mine.size_pref ? ` (size ${mine.size_pref})` : ""}.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            leave.mutate(waitlistId, {
              onSuccess: () => toast({ title: "Removed from waitlist" }),
            })
          }
          disabled={leave.isPending}
        >
          Leave waitlist
        </Button>
      </div>
    );
  }

  if (full) {
    return (
      <div className="rounded-xl border border-border bg-card/40 p-4 text-sm text-muted-foreground">
        Waitlist is full.
      </div>
    );
  }

  return (
    <form
      className="rounded-xl border border-border bg-card/40 p-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        join.mutate(
          { waitlist_id: waitlistId, email: email || undefined, size_pref: size || undefined },
          {
            onSuccess: () => {
              toast({ title: "You're on the waitlist!" });
              setEmail("");
              setSize("");
            },
            onError: (err: any) =>
              toast({ title: "Could not join", description: err.message, variant: "destructive" }),
          },
        );
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="mwl-email">Notification email (optional)</Label>
        <Input
          id="mwl-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="mwl-size">Size preference (optional)</Label>
        <Input
          id="mwl-size"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="M / L / XL"
        />
      </div>
      <Button type="submit" disabled={join.isPending} className="w-full">
        {join.isPending ? "Joining..." : "Join waitlist"}
      </Button>
    </form>
  );
}
