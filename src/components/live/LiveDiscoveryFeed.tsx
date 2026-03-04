import { motion } from "framer-motion";
import { Flame, TrendingUp, Compass, Sparkles } from "lucide-react";
import StreamCard from "./StreamCard";
import { mockStreams, categories } from "@/data/mockStreams";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const sections = [
  { id: "trending", label: "Trending Live", icon: Flame, description: "Most-watched streams right now" },
  { id: "rising", label: "Rising Creators", icon: TrendingUp, description: "Breakout creators gaining momentum" },
  { id: "category", label: "By Category", icon: Compass, description: "Find streams in your niche" },
  { id: "foryou", label: "For You", icon: Sparkles, description: "Personalized picks based on your interests" },
];

export default function LiveDiscoveryFeed() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const trendingStreams = [...mockStreams].sort((a, b) => b.viewers - a.viewers).slice(0, 4);
  const risingStreams = mockStreams.filter((s) => s.creatorTier <= 2).slice(0, 4);
  const categoryStreams = selectedCategory
    ? mockStreams.filter((s) => s.category === selectedCategory)
    : mockStreams.slice(0, 4);
  const forYouStreams = [...mockStreams].sort(() => Math.random() - 0.5).slice(0, 4);

  return (
    <div className="space-y-16">
      {/* Trending Live */}
      <section>
        <SectionHeader section={sections[0]} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {trendingStreams.map((s, i) => (
            <StreamCard key={s.id} stream={s} index={i} />
          ))}
        </div>
      </section>

      {/* Rising Creators */}
      <section>
        <SectionHeader section={sections[1]} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {risingStreams.map((s, i) => (
            <StreamCard key={s.id} stream={s} index={i} />
          ))}
        </div>
      </section>

      {/* By Category */}
      <section>
        <SectionHeader section={sections[2]} />
        <div className="flex gap-2 flex-wrap mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categoryStreams.map((s, i) => (
            <StreamCard key={s.id} stream={s} index={i} />
          ))}
        </div>
      </section>

      {/* For You */}
      <section>
        <SectionHeader section={sections[3]} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {forYouStreams.map((s, i) => (
            <StreamCard key={s.id} stream={s} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ section }: { section: (typeof sections)[0] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      className="flex items-center gap-3 mb-6"
    >
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
        <section.icon className="w-4.5 h-4.5 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-foreground">{section.label}</h2>
        <p className="text-xs text-muted-foreground">{section.description}</p>
      </div>
    </motion.div>
  );
}
