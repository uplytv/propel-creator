export const PLATFORM_FEES = {
  subscription: 0.03,    // 3% of membership revenue
  marketplace: 0.10,     // 10% of job payouts
  tip: 0.05,             // 5% of tips
  boost: 0.00            // 0% on ad boost credits
}

export const calculateNetAmount = (grossAmount: number, feeType: keyof typeof PLATFORM_FEES) => {
  const fee = grossAmount * PLATFORM_FEES[feeType]
  return {
    gross: grossAmount,
    fee: parseFloat(fee.toFixed(2)),
    net: parseFloat((grossAmount - fee).toFixed(2))
  }
}
