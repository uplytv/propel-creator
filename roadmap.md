# Edge-function security hardening
- [x] P0: authenticate, validate and escape weekly report email.
- [x] Sign and verify Meta OAuth state; verify heartbeat caller.
- [x] Authenticate/rate-limit AI calls and guard URL imports against SSRF.
- [x] Add rollout-safe cron authorization to the six specified functions.
- [ ] Harden partner checkout: blocked because the endpoint is deployed but its source is absent from this checkout; current PRICES/line items/metadata cannot safely be preserved without source.
- [x] Run 48 focused security tests, check all 13 changed handlers with Deno, deploy them, and verify live invalid-auth and forged-state rejection.