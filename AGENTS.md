# Architecture rules
- Edge-function secret comparisons use `_shared/constantTime.ts` to avoid content-dependent early exits.
- Cron handlers use `_shared/cronAuth.ts` with rollout compatibility except ticket hold releases, which require the dedicated shared secret unconditionally to prevent unauthorized inventory changes.
- Meta OAuth state contains only a signed nonce; the service-role-only consumption RPC atomically validates age, consumes the nonce and returns stored identity to prevent replay and identity forgery.
- Resale wallet credits use a service-role-only RPC locking the order and wallet and inserting the ledger atomically; cents are converted only at legacy decimal storage boundaries to preserve balances.
- AI endpoints opt into fail-closed shared rate limiting where required; other endpoints retain their existing fail-open behavior for compatibility.
- URL imports isolate DNS, redirect and bounded-fetch validation in the function's own `urlGuard.ts`.