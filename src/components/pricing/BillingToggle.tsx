import { Button } from "@/components/ui/button";
import type { BillingInterval } from "./plans";

export default function BillingToggle({ value, onChange }: { value: BillingInterval; onChange: (value: BillingInterval) => void }) {
  return <div className="flex flex-wrap items-center justify-center gap-2 mb-8" role="group" aria-label="Billing interval">
    <Button variant={value === "monthly" ? "default" : "outline"} aria-pressed={value === "monthly"} onClick={() => onChange("monthly")}>Monthly</Button>
    <Button variant={value === "annual" ? "default" : "outline"} aria-pressed={value === "annual"} onClick={() => onChange("annual")}>Annual · 2 months free</Button>
  </div>;
}