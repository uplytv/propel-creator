import { useState } from "react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/context/AuthContext";
import { useCreatorAffiliateProgram, useUpsertCreatorAffiliateProgram } from "@/hooks/useAffiliates";
import { toast } from "sonner";
import { Loader2, Settings2 } from "lucide-react";

export function CreatorAffiliateProgramSettings() {
  const { user } = useAuth();
  const { data: program, isLoading } = useCreatorAffiliateProgram(user?.id);
  const upsert = useUpsertCreatorAffiliateProgram();

  const [isActive, setIsActive] = useState(program?.is_active ?? false);
  const [commissionRate, setCommissionRate] = useState(program?.commission_rate ?? 20);
  const [cookieDays, setCookieDays] = useState(program?.cookie_duration_days ?? 30);
  const [initialized, setInitialized] = useState(false);

  // Sync from loaded data
  if (program && !initialized) {
    setIsActive(program.is_active);
    setCommissionRate(Number(program.commission_rate));
    setCookieDays(program.cookie_duration_days);
    setInitialized(true);
  }

  const handleSave = async () => {
    await upsert.mutateAsync({
      commission_rate: commissionRate,
      cookie_duration_days: cookieDays,
      is_active: isActive,
    });
    toast.success("Affiliate program settings saved!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <Settings2 className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Affiliate Program</h3>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Enable Affiliate Program</Label>
          <p className="text-xs text-muted-foreground">Let members earn commissions by referring new subscribers</p>
        </div>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      {isActive && (
        <>
          <div className="space-y-2">
            <Label className="text-sm">Commission Rate: {commissionRate}%</Label>
            <Slider
              value={[commissionRate]}
              onValueChange={([v]) => setCommissionRate(v)}
              min={5}
              max={50}
              step={1}
            />
            <p className="text-xs text-muted-foreground">Members earn this % of revenue from each referred subscriber</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Cookie Duration (days)</Label>
            <Input
              type="number"
              value={cookieDays}
              onChange={(e) => setCookieDays(Number(e.target.value))}
              min={1}
              max={365}
            />
          </div>
        </>
      )}

      <Button onClick={handleSave} disabled={upsert.isPending} className="w-full">
        {upsert.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Save Settings
      </Button>
    </motion.div>
  );
}
