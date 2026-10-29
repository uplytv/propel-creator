/** Bound user-visible waits without automatically repeating account/payment writes. */
export async function withTrialTimeout<T>(operation: PromiseLike<T>, message: string, timeoutMs = 25000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
export function hostedCheckoutUrl(value: unknown): string {
  if (typeof value !== "string") throw new Error("Stripe did not return a checkout link. Please try again.");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Invalid Stripe checkout link.");
  return url.href;
}