import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Radio, Plus, Loader2, MapPin } from "lucide-react";
import { useState } from "react";
import { useGeolocation, useNearbyRadiates, trackRadiate } from "@/hooks/useRadiate";
import { RadiateCard } from "@/components/radiate/RadiateCard";

export default function RadiateFeedPage() {
  const [maxKm, setMaxKm] = useState(25);
  const geo = useGeolocation();
  const coords = geo.data ?? null;
  const { data: radiates = [], isLoading } = useNearbyRadiates(coords, maxKm);

  useEffect(() => {
    radiates.forEach((r) => trackRadiate(r.id, "view"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiates.length]);

  return (
    <div className="min-h-screen bg-background mobile-safe-content">
      <Helmet>
        <title>Radiate · Local discovery on UPLY</title>
        <meta name="description" content="Discover what creators near you are radiating right now." />
      </Helmet>

      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border/40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary" />
          <h1 className="font-heading text-lg font-semibold">Radiate</h1>
        </div>
        <Button asChild size="sm" className="min-h-[44px]">
          <Link to="/radiate/new"><Plus className="h-4 w-4 mr-1" /> New</Link>
        </Button>
      </header>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" /> Within
            </span>
            <span className="font-medium text-foreground">{maxKm} km</span>
          </div>
          <Slider value={[maxKm]} min={1} max={100} step={1} onValueChange={(v) => setMaxKm(v[0])} />
        </div>

        {geo.isError && (
          <div className="rounded-lg border border-border/40 p-4 text-sm text-muted-foreground">
            We need your location to show nearby radiates. Enable location access and refresh.
          </div>
        )}

        {(geo.isLoading || isLoading) && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && coords && radiates.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <Radio className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
            <p className="text-muted-foreground">No radiates within {maxKm} km yet.</p>
            <Button asChild variant="outline">
              <Link to="/radiate/new">Be the first to radiate</Link>
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {radiates.map((r) => (
            <RadiateCard key={r.id} radiate={r} />
          ))}
        </div>

        {radiates.length > 0 && (
          <div className="text-center pt-4">
            <Button asChild variant="ghost" size="sm">
              <Link to="/radiate/manage">Manage your radiates</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
