# Evaluation PDF export

## Département du travail et validation DA
- [ ] Vérifier les règles serveur déjà installées et actualiser les types.
- [ ] Paramétrer les départements, ajouter les choix mission/dossier et retirer le champ profil.
- [ ] Réserver la validation au DA ; PDF avec historique/validation uniquement en cas de désaccord, signatures conservées.
- [ ] Tester les règles et vérifier les formulaires authentifiés ; déployer l'export.

## Dossiers comptables évaluables
- [x] Vérifier les RPC installées, tracer get_mission_evaluations et compléter les repères objet manquants de get_my_evaluations/get_evaluation_form ; types régénérés.
- [x] Ajouter l'ouverture depuis la fiche fiscale, les repères dans les listes et les libellés fiche/PDF ; fonction déployée.
- [x] Vérifier l'ouverture authentifiée, les listes, 22 tests, deno check et le PDF de contrôle ; compilation sans erreur.
- [ ] Vérifier le cycle dossier complet et son téléchargement hébergé : le seul dossier accessible n'a aucun participant sur 2026, l'ouverture renvoie 0 affectation. Aucun dossier RH artificiel créé.

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
- [ ] Verify populated scoring, observations, validation and archive readback end-to-end: requires an authorized real HR evaluation to progress through the cycle; do not invent ratings or profile values.

- [x] Review second uploaded brief: identical requirements; preserve approved archive separation.

- [x] Add standalone export function and explicit JWT configuration; deployment succeeded.
- [x] Separate and encrypt archived audience variants, retaining RPC authorization; 4 tests passed.
- [x] Verify deployed generation: authenticated synthesis returned a readable PDF; invalid inputs returned 400.
- [x] Configure APP_ORIGINS: saved through the secure form.