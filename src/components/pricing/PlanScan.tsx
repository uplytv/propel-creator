import { PLATFORM_FEE_PCT, PLATFORM_PLANS, type PlatformPlan } from "@/components/pricing/plans";

function covers(plan: PlatformPlan, match: (text: string) => boolean): boolean {
  if (plan.features.some(match)) return true;
  if (plan.features.some((f) => f.startsWith("Everything in Unlimited"))) {
    const unlimited = PLATFORM_PLANS.find((p) => p.key === "unlimited");
    const starter = PLATFORM_PLANS.find((p) => p.key === "starter");
    return Boolean(
      (unlimited && unlimited.features.some(match)) || (starter && starter.features.some(match)),
    );
  }
  if (plan.features.some((f) => f.startsWith("Everything in Starter"))) {
    const starter = PLATFORM_PLANS.find((p) => p.key === "starter");
    return Boolean(starter && starter.features.some(match));
  }
  return false;
}

const ROWS: { label: string; cell: (plan: PlatformPlan) => string }[] = [
  { label: "You keep", cell: () => `${100 - PLATFORM_FEE_PCT}% of the charge` },
  { label: "UPLY fee", cell: () => `Flat ${PLATFORM_FEE_PCT}%` },
  {
    label: "Community + courses",
    cell: (plan) => (covers(plan, (f) => /community|course/i.test(f)) ? "Yes" : "—"),
  },
  {
    label: "Live tips",
    cell: (plan) => (covers(plan, (f) => /tips/i.test(f)) ? "Yes" : "—"),
  },
  {
    label: "Tickets",
    cell: (plan) => (covers(plan, (f) => /ticket|event/i.test(f)) ? "Yes" : "—"),
  },
  {
    label: "Pay-per-view",
    cell: (plan) => (covers(plan, (f) => /pay-per-view/i.test(f)) ? "Yes" : "—"),
  },
];

/** Compact plan matrix. Numbers come from PLATFORM_PLANS and PLATFORM_FEE_PCT. */
export default function PlanScan() {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[520px] text-left text-sm">
        <caption className="sr-only">
          UPLY plans. Every plan keeps {100 - PLATFORM_FEE_PCT}% of a fan charge. The UPLY fee is a flat {PLATFORM_FEE_PCT}%. Stripe fees are separate.
        </caption>
        <thead>
          <tr className="border-b border-border bg-card">
            <th scope="col" className="p-3 font-medium text-foreground/80">
              <span className="sr-only">Included</span>
            </th>
            {PLATFORM_PLANS.map((plan) => (
              <th key={plan.key} scope="col" className="p-3 text-center font-bold text-foreground">
                {plan.name}
                <span className="mt-0.5 block text-xs font-semibold text-foreground/80">${plan.price}/mo</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.label} className="border-b border-border/60 last:border-0">
              <th scope="row" className="p-3 font-medium text-foreground">
                {row.label}
              </th>
              {PLATFORM_PLANS.map((plan) => (
                <td key={plan.key} className="p-3 text-center text-foreground">
                  {row.cell(plan)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
