# Evaluation PDF export

## Alignement Note / Contribution
- [x] Placer les notes des sous-critères dans la colonne Note du PDF, sans modifier les calculs ou les archives.
- [x] Aligner la fiche d’évaluation sur les colonnes du PDF : fiche réelle vérifiée, PDF de contrôle rendu, 16 tests réussis et fonction déployée. Le téléchargement hébergé n’a pas abouti pendant le contrôle ; les archives existantes restent inchangées.

## Module Évaluation V2.1
- [x] Add live scoring, RPC hooks, profiles and mission integrations.
- [x] Add evaluations, campaign, objectives, synthesis, register, confidential feedback and export journal.
- [x] Add cabinet settings and navigation; remove legacy task rating UI.
- [x] Run 16 business/archive tests and authenticated browser checks: settings save/readback, fiscal simulation, 18 echelon choices, mission RPC, denied unauthorized synthesis, PDF download and export journal.
- [ ] Verify populated scoring, observations, validation and archive readback end-to-end: requesting account has no evaluation assignments or evaluations; do not invent HR records or profile values.

- [x] Review second uploaded brief: identical requirements; preserve approved archive separation.

- [x] Add standalone export function and explicit JWT configuration; deployment succeeded.
- [x] Separate and encrypt archived audience variants, retaining RPC authorization; 4 tests passed.
- [x] Verify deployed generation: authenticated synthesis returned a readable PDF; invalid inputs returned 400.
- [x] Configure APP_ORIGINS: saved through the secure form.