import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const steps = [
  { num: "01", title: "Create your space", desc: "Sign up, pick your niche, and customize your creator profile in under 2 minutes." },
  { num: "02", title: "Build your world", desc: "Add courses, schedule events, set up tiers, and invite your community." },
  { num: "03", title: "Get paid directly", desc: "Members subscribe, buy tickets, tip during streams — money hits your account instantly." },
];

export default function HowItWorks() {
  return (
    <section className="py-16 md:py-24 relative">
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl md:text-4xl font-bold mb-3 font-heading">Live in 3 steps.</h2>
          <p className="text-white/40 text-sm md:text-base">From zero to earning in under 10 minutes.</p>
        </motion.div>

        <div className="max-w-3xl mx-auto grid md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className="relative text-center md:text-left"
            >
              <span className="text-5xl md:text-6xl font-extrabold text-primary/10 block mb-2 font-heading">{s.num}</span>
              <h3 className="font-bold text-white text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 -right-4 w-8 text-white/10">
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
