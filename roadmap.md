# Evaluation PDF export

## Module Évaluation V2.1
- [ ] Add live scoring, RPC hooks, profiles and mission integrations.
- [ ] Add evaluations, campaign, objectives, synthesis, register, confidential feedback and export journal.
- [ ] Add cabinet settings and navigation; remove legacy task rating UI.
- [ ] Run business-rule tests and authenticated browser checks.

- [x] Review second uploaded brief: identical requirements; preserve approved archive separation.

- [x] Add standalone export function and explicit JWT configuration; deployment succeeded.
- [x] Separate and encrypt archived audience variants, retaining RPC authorization; 4 tests passed.
- [x] Verify deployed generation: authenticated synthesis returned a readable PDF; invalid inputs returned 400.
- [ ] Verify a populated evaluation export and archive readback: requesting account has no evaluations available.
- [x] Configure APP_ORIGINS: saved through the secure form.