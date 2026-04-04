import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import BackNav from "@/components/BackNav";
import {
  Search, ToggleLeft, History, LayoutGrid, GraduationCap,
  Radio, DollarSign, Bot, ChevronDown, AlertTriangle
} from "lucide-react";

const coreIcons: Record<string, any> = {
  space: LayoutGrid,
  learn: GraduationCap,
  live: Radio,
  earn: DollarSign,
  aria: Bot,
};

const coreLabels: Record<string, string> = {
  space: "SPACE",
  learn: "LEARN",
  live: "LIVE",
  earn: "EARN",
  aria: "ARIA",
};

const tierColors: Record<string, string> = {
  core: "bg-primary/20 text-primary",
  embedded: "bg-blue-500/20 text-blue-400",
  advanced: "bg-amber-500/20 text-amber-400",
};

export default function AdminFeatureToggles() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCores, setExpandedCores] = useState<string[]>(["space", "learn", "live", "earn", "aria"]);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("business_categories").select("*").order("position");
      return data || [];
    },
  });

  // Fetch all features
  const { data: features = [] } = useQuery({
    queryKey: ["admin-features"],
    queryFn: async () => {
      const { data } = await supabase.from("feature_registry").select("*").order("position");
      return data || [];
    },
  });

  // Fetch defaults for selected category
  const { data: defaults = [] } = useQuery({
    queryKey: ["admin-category-defaults", selectedCategory],
    queryFn: async () => {
      const { data } = await supabase
        .from("category_feature_defaults")
        .select("*")
        .eq("category_id", selectedCategory!);
      return data || [];
    },
    enabled: !!selectedCategory,
  });

  // Fetch audit log
  const { data: auditLog = [] } = useQuery({
    queryKey: ["admin-audit-log"],
    queryFn: async () => {
      const { data } = await supabase
        .from("feature_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Auto-select first category
  if (!selectedCategory && categories.length > 0) {
    setSelectedCategory((categories[0] as any).id);
  }

  const defaultsMap = useMemo(() =>
    Object.fromEntries(defaults.map((d: any) => [d.feature_key, d])),
    [defaults]
  );

  const toggleFeature = async (featureKey: string, enabled: boolean) => {
    if (!selectedCategory || !user) return;

    const feature = features.find((f: any) => (f as any).key === featureKey) as any;

    // Check dependencies
    if (enabled && feature?.dependencies?.length > 0) {
      const missingDeps = feature.dependencies.filter((dep: string) => {
        const depDefault = defaultsMap[dep];
        return depDefault && !depDefault.enabled;
      });
      if (missingDeps.length > 0) {
        toast.error("Missing dependencies", { description: `Enable these first: ${missingDeps.join(" });
        return;
      }
    }

    // Check if disabling would break dependents
    if (!enabled) {
      const dependents = features.filter((f: any) => {
        const feat = f as any;
        return feat.dependencies?.includes(featureKey) && defaultsMap[feat.key]?.enabled;
      });
      if (dependents.length > 0) {
        const names = dependents.map((d: any) => (d as any).label).join(", ");
        toast.error("Cannot disable", { description: `These features depend on it: ${names });
        return;
      }
    }

    const existing = defaultsMap[featureKey];
    if (existing) {
      await supabase
        .from("category_feature_defaults")
        .update({ enabled })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("category_feature_defaults")
        .insert({ category_id: selectedCategory, feature_key: featureKey, enabled });
    }

    // Audit log
    await supabase.from("feature_audit_log").insert({
      actor_id: user.id,
      action: enabled ? "enable" : "disable",
      feature_key: featureKey,
      target_type: "category",
      target_id: selectedCategory,
      old_value: { enabled: !enabled },
      new_value: { enabled },
    });

    queryClient.invalidateQueries({ queryKey: ["admin-category-defaults", selectedCategory] });
    queryClient.invalidateQueries({ queryKey: ["admin-audit-log"] });
    toast.success("${enabled ? "Enabled" : "Disabled"} ${feature?.label || featureKey}");
  };

  const bulkToggleCore = async (core: string, enabled: boolean) => {
    const coreFeatures = features.filter((f: any) => (f as any).core === core);
    for (const f of coreFeatures) {
      const feat = f as any;
      if (feat.tier === "core" && !enabled) continue; // Can't disable core-tier features
      const current = defaultsMap[feat.key];
      if (current?.enabled !== enabled) {
        await toggleFeature(feat.key, enabled);
      }
    }
  };

  const filteredFeatures = features.filter((f: any) => {
    const feat = f as any;
    if (search && !feat.label.toLowerCase().includes(search.toLowerCase()) && !feat.key.includes(search.toLowerCase())) return false;
    return true;
  });

  const groupedFeatures = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const f of filteredFeatures) {
      const feat = f as any;
      if (!groups[feat.core]) groups[feat.core] = [];
      groups[feat.core].push(feat);
    }
    return groups;
  }, [filteredFeatures]);

  const selectedCat = categories.find((c: any) => (c as any).id === selectedCategory) as any;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <BackNav />
        <div className="flex items-center gap-3">
          <ToggleLeft className="w-7 h-7 text-accent-green" />
          <h1 className="text-2xl font-bold">Feature Toggle Center</h1>
        </div>

        <Tabs defaultValue="toggles">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="toggles">Category Defaults</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="toggles" className="space-y-4">
            {/* Category Selector */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat: any) => (
                <Button
                  key={cat.id}
                  size="sm"
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="text-xs"
                >
                  {cat.icon} {cat.name}
                </Button>
              ))}
            </div>

            {selectedCat && (
              <p className="text-sm text-muted-foreground">
                Editing defaults for <strong>{selectedCat.icon} {selectedCat.name}</strong> — {selectedCat.description}
              </p>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search features..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Feature Groups */}
            {["space", "learn", "live", "earn", "aria"].map(core => {
              const Icon = coreIcons[core];
              const coreFeatures = groupedFeatures[core] || [];
              if (coreFeatures.length === 0) return null;
              const isExpanded = expandedCores.includes(core);
              const enabledCount = coreFeatures.filter((f: any) => defaultsMap[f.key]?.enabled !== false).length;

              return (
                <Card key={core} className="bg-card border-border">
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => setExpandedCores(prev =>
                      prev.includes(core) ? prev.filter(c => c !== core) : [...prev, core]
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-primary" />
                        <CardTitle className="text-base">{coreLabels[core]}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {enabledCount}/{coreFeatures.length} enabled
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7"
                          onClick={(e) => { e.stopPropagation(); bulkToggleCore(core, true); }}
                        >
                          All ON
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7"
                          onClick={(e) => { e.stopPropagation(); bulkToggleCore(core, false); }}
                        >
                          All OFF
                        </Button>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {coreFeatures.map((f: any) => {
                          const isOn = defaultsMap[f.key]?.enabled !== false;
                          const isCoreTier = f.tier === "core";
                          return (
                            <div key={f.key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/20">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Switch
                                  checked={isOn}
                                  onCheckedChange={(val) => toggleFeature(f.key, val)}
                                  disabled={isCoreTier}
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{f.label}</span>
                                    <Badge variant="outline" className={`text-[10px] border-0 ${tierColors[f.tier]}`}>
                                      {f.tier}
                                    </Badge>
                                    {isCoreTier && (
                                      <span className="text-[10px] text-muted-foreground">(always on)</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">{f.description}</p>
                                  {f.dependencies?.length > 0 && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <AlertTriangle className="w-3 h-3 text-yellow-500" />
                                      <span className="text-[10px] text-muted-foreground">
                                        Requires: {f.dependencies.join(", ")}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="audit">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base">Recent Changes</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {auditLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No changes recorded yet</p>
                ) : (
                  <div className="space-y-2">
                    {auditLog.map((entry: any) => (
                      <div key={entry.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                        <div>
                          <p className="text-sm">
                            <span className={entry.action === "enable" ? "text-accent-green" : "text-destructive"}>
                              {entry.action === "enable" ? "Enabled" : "Disabled"}
                            </span>{" "}
                            <strong>{entry.feature_key}</strong>
                            {entry.target_type === "category" && " (category default)"}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), "MMM d, HH:mm")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
