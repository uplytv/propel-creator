import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Radio } from "lucide-react";
import { useMyRadiates, useDeleteRadiate } from "@/hooks/useRadiate";
import { RadiateCard } from "@/components/radiate/RadiateCard";
import { toast } from "@/hooks/use-toast";

export default function RadiateManagePage() {
  const { data: mine = [], isLoading } = useMyRadiates();
  const del = useDeleteRadiate();

  const onDelete = async (id: string) => {
    if (!confirm("Stop radiating this?")) return;
    try {
      await del.mutateAsync(id);
      toast({ title: "Stopped" });
    } catch (e: any) {
      toast({ title: "Could not stop", description: e.message, variant: "destructive" });
    }
  };

  const now = Date.now();
  const active = mine.filter((r) => new Date(r.expires_at).getTime() > now);
  const expired = mine.filter((r) => new Date(r.expires_at).getTime() <= now);

  return (
    <div className="min-h-screen bg-background mobile-safe-content">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border/40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary" />
          <h1 className="font-heading text-lg font-semibold">My radiates</h1>
        </div>
        <Button asChild size="sm" className="min-h-[44px]">
          <Link to="/radiate/new"><Plus className="h-4 w-4 mr-1" /> New</Link>
        </Button>
      </header>

      <div className="px-4 py-4 space-y-6 max-w-2xl mx-auto">
        {isLoading && (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        )}

        {!isLoading && mine.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <Radio className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
            <p className="text-muted-foreground">You haven't radiated anything yet.</p>
            <Button asChild><Link to="/radiate/new">Start your first radiate</Link></Button>
          </div>
        )}

        {active.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm uppercase tracking-wide text-muted-foreground">Active</h2>
            {active.map((r) => (
              <RadiateCard key={r.id} radiate={r} showOwnerActions onDelete={onDelete} />
            ))}
          </section>
        )}

        {expired.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm uppercase tracking-wide text-muted-foreground">Past</h2>
            {expired.map((r) => (
              <RadiateCard key={r.id} radiate={r} showOwnerActions onDelete={onDelete} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
