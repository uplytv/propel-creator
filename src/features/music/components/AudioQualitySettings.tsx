import { Headphones, Sparkles, Wifi, Volume2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAudioPreferences, useUpdateAudioPreferences } from '../hooks/useAudioPreferences';

export function AudioQualitySettings() {
  const { data: prefs, isLoading } = useAudioPreferences();
  const update = useUpdateAudioPreferences();

  if (isLoading || !prefs) {
    return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading audio settings…</div>;
  }

  const Row = ({
    icon: Icon,
    title,
    desc,
    badge,
    checked,
    onCheck,
  }: {
    icon: any;
    title: string;
    desc: string;
    badge?: string;
    checked: boolean;
    onCheck: (v: boolean) => void;
  }) => (
    <div className="flex items-start justify-between gap-3 py-4 border-b border-border last:border-0">
      <div className="flex gap-3 min-w-0">
        <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold">{title}</span>
            {badge && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheck} className="mt-1" />
    </div>
  );

  return (
    <section className="rounded-2xl border border-border bg-card p-1 px-4 sm:px-6">
      <h2 className="font-display text-lg font-bold pt-4 pb-2">Audio quality</h2>
      <Row
        icon={Sparkles}
        title="Spatial Audio"
        badge="Dolby Atmos"
        desc="Immersive 3D sound on supported tracks. Best with headphones."
        checked={prefs.spatial_enabled}
        onCheck={(v) => update.mutate({ spatial_enabled: v })}
      />
      <Row
        icon={Headphones}
        title="Lossless / Hi-Res"
        badge="Up to 24-bit"
        desc="Studio-quality FLAC streaming. Uses more data."
        checked={prefs.lossless_enabled}
        onCheck={(v) => update.mutate({ lossless_enabled: v })}
      />
      <Row
        icon={Wifi}
        title="Hi-Res on Wi-Fi only"
        desc="Save mobile data — fall back to standard quality on cellular."
        checked={prefs.prefer_on_wifi_only}
        onCheck={(v) => update.mutate({ prefer_on_wifi_only: v })}
      />
      <Row
        icon={Volume2}
        title="Normalize volume"
        desc="Match loudness across tracks so nothing blows out your ears."
        checked={prefs.normalize_volume}
        onCheck={(v) => update.mutate({ normalize_volume: v })}
      />
    </section>
  );
}
