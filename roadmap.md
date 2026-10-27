# Evaluation PDF export

## Dossiers comptables évaluables
- [ ] Vérifier les RPC déjà installées et tracer la fonction mission existante dans les migrations.
- [ ] Ajouter l'ouverture depuis la fiche fiscale, les repères dans les listes et les libellés fiche/PDF.
- [ ] Vérifier les permissions, les tests et un dossier réel ; ne pas inventer de notes RH.

## Signatures après impression
- [x] Ajouter les zones évaluateur et collaborateur à la fin des PDF d’évaluation et retirer les tirets cuivre des titres ; fonction déployée, 18 tests réussis, PDF hébergé 200 contrôlé visuellement. Archives existantes conservées.

## Barre du score pondéré
- [x] Retirer l’échelle de progression du bloc « Score pondéré » du PDF uniquement ; la fiche d’évaluation la conserve. Fonction redéployée, PDF de contrôle rendu et vérifié.

## Grille du cabinet - complément
- [x] Ajouter les 6 colonnes, en-têtes fixes, décimales, totaux et masquer les moyennes partielles.
- [x] Afficher les 2 blocs de commentaires attribués et l’échelle issue du cabinet.
- [x] Mettre à jour le PDF, redéployer et vérifier : fiche réelle, PDF de contrôle rendu, PDF hébergé 200 et 18 tests réussis. Archives précédentes conservées.

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