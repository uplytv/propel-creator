# Architecture rules
- Edge-function secret comparisons use `_shared/constantTime.ts` to avoid content-dependent early exits.
- Cron handlers use `_shared/cronAuth.ts` and enforce only when the shared cron secret is configured, preserving existing schedule compatibility during rollout.
- Meta OAuth state uses the shared HMAC helper before trusting user identity; URL imports isolate DNS, redirect and bounded-fetch validation in the function's own `urlGuard.ts`.