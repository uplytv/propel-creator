import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSubmitMailbag } from "../hooks/useMailbag";
import { useToast } from "@/hooks/use-toast";

const MAX = 280;

export function MailbagSubmitForm({ artistId }: { artistId: string }) {
  const submit = useSubmitMailbag();
  const { toast } = useToast();
  const [text, setText] = useState("");

  const send = async () => {
    if (!text.trim()) return;
    try {
      await submit.mutateAsync({ artist_id: artistId, question: text.trim() });
      toast({ title: "Question sent to mailbag" });
      setText("");
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="space-y-1">
        <Label htmlFor="mb-q">Ask the artist anything</Label>
        <Textarea
          id="mb-q"
          rows={3}
          maxLength={MAX}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What inspired your latest album?"
        />
        <div className="text-xs text-muted-foreground text-right">
          {text.length}/{MAX}
        </div>
      </div>
      <Button
        onClick={send}
        disabled={submit.isPending || !text.trim()}
        className="w-full min-h-11"
      >
        Send to mailbag
      </Button>
    </Card>
  );
}
