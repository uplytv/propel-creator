import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag, ArrowRight } from "lucide-react";

export function CreatorEventsCard({ creatorId }: { creatorId: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { count: c } = await supabase
        .from("event_creator_tags")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", creatorId);
      setCount(c || 0);
    })();
  }, [creatorId]);

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center gap-2 mb-2"><Tag className="w-4 h-4 text-primary" /><h3 className="font-semibold">Events</h3></div>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs text-muted-foreground mb-3">Events your content is tagged to</div>
      <Button asChild size="sm" variant="outline" className="w-full">
        <Link to="/events">Tag content to an event <ArrowRight className="w-3 h-3 ml-1" /></Link>
      </Button>
    </Card>
  );
}
