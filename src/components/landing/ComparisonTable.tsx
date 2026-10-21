import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const comparisonRows = [
  { feature: "Live streaming with tips", uply: true, youtube: false, patreon: false, skool: false },
  { feature: "Courses & classroom", uply: true, youtube: false, patreon: false, skool: true },
  { feature: "Events & ticketing", uply: true, youtube: false, patreon: false, skool: false },
  { feature: "Paid DMs", uply: true, youtube: false, patreon: false, skool: false },
  { feature: "Live shopping & auctions", uply: true, youtube: false, patreon: false, skool: false },
  { feature: "Community & leaderboards", uply: true, youtube: false, patreon: true, skool: true },
  { feature: "AI growth assistant", uply: true, youtube: false, patreon: false, skool: false },
  { feature: "Affiliate system", uply: true, youtube: false, patreon: false, skool: false },
  { feature: "Direct payouts (Stripe)", uply: true, youtube: false, patreon: true, skool: true },
  { feature: "0% UPLY fee on Pro/Studio", uply: true, youtube: false, patreon: false, skool: false },
];

export default function ComparisonTable() {
  return (
    <section className="py-16 md:py-24 relative">
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-4xl font-bold mb-3 font-heading">
            Why creators are switching.
          </h2>
          <p className="text-white/40 text-sm md:text-base max-w-md mx-auto">
            Other platforms give you pieces. Uply gives you the whole thing.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-3xl mx-auto rounded-xl border border-white/[0.08] overflow-hidden"
        >
          <div className="grid grid-cols-5 bg-white/[0.03] border-b border-white/[0.06]">
            <div className="col-span-1 p-3 md:p-4" />
            <div className="p-3 md:p-4 text-center"><span className="text-xs md:text-sm font-bold text-primary">Uply</span></div>
            <div className="p-3 md:p-4 text-center"><span className="text-xs md:text-sm text-white/40">YouTube</span></div>
            <div className="p-3 md:p-4 text-center"><span className="text-xs md:text-sm text-white/40">Patreon</span></div>
            <div className="p-3 md:p-4 text-center"><span className="text-xs md:text-sm text-white/40">Skool</span></div>
          </div>

          {comparisonRows.map((row, i) => (
            <div
              key={row.feature}
              className={`grid grid-cols-5 ${i < comparisonRows.length - 1 ? "border-b border-white/[0.04]" : ""} ${i % 2 === 0 ? "bg-white/[0.01]" : ""}`}
            >
              <div className="col-span-1 p-3 md:p-4 flex items-center">
                <span className="text-xs md:text-sm text-white/60">{row.feature}</span>
              </div>
              {[row.uply, row.youtube, row.patreon, row.skool].map((val, j) => (
                <div key={j} className="p-3 md:p-4 flex items-center justify-center">
                  {val ? (
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${j === 0 ? "bg-primary/20" : "bg-white/10"}`}>
                      <Check className={`w-3 h-3 ${j === 0 ? "text-primary" : "text-white/50"}`} />
                    </div>
                  ) : (
                    <X className="w-3.5 h-3.5 text-white/15" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
