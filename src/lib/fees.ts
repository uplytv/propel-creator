import { getPlatformFeeRate } from "../../supabase/functions/_shared/platformFees";

export { getPlatformFeeRate };
export const PLATFORM_FEES = {
  subscription: 0.03,    // 3% of membership revenue
  marketplace: 0.10,     // 10% of job payouts
  tip: getPlatformFeeRate(), // Legacy estimate while rollout is disabled
  boost: 0.00            // 0% on ad boost credits
}

export const calculateNetAmount = (grossAmount: number, feeType: keyof typeof PLATFORM_FEES, plan?: string, enabled = false) => {
  const creatorSale = feeType === "subscription" || feeType === "tip";
  // Preserve this utility's historical subscription estimate while disabled.
  const rate = creatorSale && enabled ? getPlatformFeeRate(plan, true) : PLATFORM_FEES[feeType];
  const fee = grossAmount * rate
  return {
    gross: grossAmount,
    fee: parseFloat(fee.toFixed(2)),
    net: parseFloat((grossAmount - fee).toFixed(2))
  }
}
