import { useChallenges } from "../hooks/useChallenges";
import { ChallengeCard } from "./ChallengeCard";
import { Link } from "react-router-dom";

export function ChallengesShelf({ title = "Active challenges" }: { title?: string }) {
  const { data = [], isLoading } = useChallenges("active");
  if (isLoading || data.length === 0) return null;

  return (
    <section className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-display font-bold">{title}</h2>
        <Link to="/music/challenges" className="text-xs text-primary">View all</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {data.slice(0, 6).map((c) => (
          <ChallengeCard key={c.id} challenge={c} />
        ))}
      </div>
    </section>
  );
}
