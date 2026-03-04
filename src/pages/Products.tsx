import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MoreVertical, Grid, List, Brain, Link, LayoutTemplate, Pencil, Users, DollarSign, BookOpen, MessageCircle, Package, Dumbbell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";

const mockProducts = [
  { id: 1, name: "Creator Mastery Course", type: "Course", price: 197, revenue: 2365, members: 12, thumb: "📚" },
  { id: 2, name: "Inner Circle Community", type: "Community", price: 29, revenue: 1450, members: 50, thumb: "🤝" },
  { id: 3, name: "1:1 Coaching Program", type: "Coaching", price: 497, revenue: 994, members: 2, thumb: "🎯" },
];

const typeIcons: Record<string, string> = { Course: "📚", Community: "🤝", Coaching: "🎯", "Digital Product": "📦" };

const createOptions = [
  { icon: Brain, label: "Create with AI", desc: "Describe your idea and AI builds everything" },
  { icon: Link, label: "Create from URL", desc: "Import your existing landing page" },
  { icon: LayoutTemplate, label: "Start from Template", desc: "Browse our template library" },
  { icon: Pencil, label: "Build from Scratch", desc: "Full control from the ground up" },
];

export default function Products() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showCreate, setShowCreate] = useState(false);
  const isEmpty = false;

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Products</h1>
            <p className="text-muted-foreground mt-1">Manage everything you sell.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setView("grid")} className={`p-2 rounded-md ${view === "grid" ? "bg-secondary" : ""}`}><Grid className="w-4 h-4" /></button>
            <button onClick={() => setView("list")} className={`p-2 rounded-md ${view === "list" ? "bg-secondary" : ""}`}><List className="w-4 h-4" /></button>
            <Button variant="default" size="sm" className="hidden md:flex" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Product</Button>
          </div>
        </div>

        {isEmpty ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-12 text-center">
            <span className="text-5xl mb-4 block">📦</span>
            <h3 className="text-xl font-bold mb-2">Your first product is one idea away.</h3>
            <p className="text-muted-foreground mb-6">Let AI build it for you — just describe what you want to sell.</p>
            <Button variant="hero" size="lg" onClick={() => setShowCreate(true)}>Create Your First Product</Button>
          </motion.div>
        ) : (
          <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
            {mockProducts.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass-card-hover p-5 ${view === "list" ? "flex items-center gap-4" : ""}`}
              >
                <div className={`text-3xl ${view === "list" ? "" : "mb-3"}`}>{p.thumb}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">{p.name}</h3>
                    <button className="p-1 rounded hover:bg-secondary"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">{p.type}</span>
                    <span className="text-sm font-semibold text-primary">${p.price}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />${p.revenue.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{p.members}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Mobile FAB */}
        <button
          onClick={() => setShowCreate(true)}
          className="md:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 z-40 active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Create Sheet */}
        <AnimatePresence>
          {showCreate && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={() => setShowCreate(false)} />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl z-50 p-6 max-h-[80vh]"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold">Create a Product</h3>
                  <button onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-secondary"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-3">
                  {createOptions.map((o) => (
                    <button key={o.label} className="glass-card-hover p-5 w-full text-left flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <o.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{o.label}</p>
                        <p className="text-xs text-muted-foreground">{o.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
