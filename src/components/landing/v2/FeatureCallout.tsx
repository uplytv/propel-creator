interface Props {
  emoji: string;
  label: string;
  desc: string;
}
export default function FeatureCallout({ emoji, label, desc }: Props) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-5 hover:border-primary/40 hover:bg-card/60 transition-all">
      <div className="text-2xl mb-2">{emoji}</div>
      <div className="font-display font-bold text-foreground mb-1">{label}</div>
      <p className="text-sm text-foreground/70 leading-relaxed">{desc}</p>
    </div>
  );
}
