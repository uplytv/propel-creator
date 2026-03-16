import { useEffect, useRef } from "react";
import { Search as SearchIcon, X, Users, Package, Radio, Film, Briefcase, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { useSearch, SearchResult } from "@/hooks/useSearch";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import BackNav from "@/components/BackNav";

const typeIcon: Record<string, typeof Users> = {
  creator: Users,
  product: Package,
  stream: Radio,
  recording: Film,
  job: Briefcase,
};

const typeLabel: Record<string, string> = {
  creator: "Creator",
  product: "Product",
  stream: "Stream",
  recording: "Recording",
  job: "Job",
};

export default function SearchPage() {
  const { query, search, results, loading } = useSearch();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce search
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const handleChange = (val: string) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.link);
  };

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] = acc[r.type] || []).push(r);
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
        <BackNav title="Search" />

        <div className="relative mt-4">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search creators, products, streams, jobs..."
            className="pl-10 pr-10 h-12 text-base bg-card border-border rounded-xl"
            defaultValue={query}
            onChange={(e) => handleChange(e.target.value)}
          />
          {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />}
        </div>

        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No results found</p>
            <p className="text-sm mt-1">Try a different search term</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {Object.entries(grouped).map(([type, items]) => {
            const Icon = typeIcon[type] || SearchIcon;
            return (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6"
              >
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {typeLabel[type]}s
                  </span>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </div>
                <div className="space-y-1">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left"
                    >
                      {item.image ? (
                        <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-muted" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{item.title}</p>
                        {item.subtitle && <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {query.length < 2 && (
          <div className="text-center py-16 text-muted-foreground">
            <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Type at least 2 characters to search</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
