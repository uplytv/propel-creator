import { Bell, Music, Clock, MessageCircle, Mic2, Mail } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useMusicNotificationPrefs, useUpdateMusicNotificationPrefs } from '../hooks/useMusicNotificationPrefs';

export function MusicNotificationSettings() {
  const { data: prefs, isLoading } = useMusicNotificationPrefs();
  const update = useUpdateMusicNotificationPrefs();

  if (isLoading || !prefs) {
    return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  const Row = ({
    icon: Icon, title, desc, checked, onCheck,
  }: { icon: any; title: string; desc: string; checked: boolean; onCheck: (v: boolean) => void }) => (
    <div className="flex items-start justify-between gap-3 py-4 border-b border-border last:border-0">
      <div className="flex gap-3 min-w-0">
        <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="font-display font-bold">{title}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheck} className="mt-1" />
    </div>
  );

  return (
    <section className="rounded-2xl border border-border bg-card px-4 sm:px-6">
      <div className="flex items-center gap-2 pt-4 pb-2">
        <Bell className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-bold">Music notifications</h2>
      </div>
      <Row icon={Music} title="New releases" desc="Get notified when artists you follow drop a track."
           checked={prefs.new_release} onCheck={(v) => update.mutate({ new_release: v })} />
      <Row icon={Clock} title="Drop reminders" desc="A nudge right before a scheduled drop goes live."
           checked={prefs.drop_reminders} onCheck={(v) => update.mutate({ drop_reminders: v })} />
      <Row icon={MessageCircle} title="Artist messages" desc="Posts from artists you follow."
           checked={prefs.artist_messages} onCheck={(v) => update.mutate({ artist_messages: v })} />
      <Row icon={Mic2} title="Concert reminders" desc="Alerts when a virtual concert is about to start."
           checked={prefs.concert_reminders} onCheck={(v) => update.mutate({ concert_reminders: v })} />
      <Row icon={Mail} title="Weekly music digest" desc="Friday recap of new music and milestones."
           checked={prefs.weekly_digest} onCheck={(v) => update.mutate({ weekly_digest: v })} />
    </section>
  );
}
