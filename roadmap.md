# Evaluation PDF export

## Retrait du portail client
- [x] Supprimer les 3 fonctions Edge (validate-portal-token, activate-portal-account, send-portal-invitation), dossiers, config et versions déployées.
- [x] Supprimer les pages, composants et hooks du portail ; retirer routes /portal/:token et /espace-client* ; nettoyer connexion, réinitialisation, AuthGuard, CRM, relances, notifications, diagnostic.
- [x] Retirer les liens morts « Déposer » des courriels de relance et de rejet (send-client-reminder, send-document-rejection) ; deno check OK.
- [x] Vérifié en navigation connectée : tableau de bord, missions, documents, CRM et fiche client (7 onglets métier) rendus ; /espace-client et /portal/:token renvoient 404 ; build OK, 42 tests réussis, deno check OK.

## Sixième rôle et grille des échelons
- [x] Ajouter Auditeur junior et limiter les deux sélecteurs aux rôles autorisés par les RPC serveur.
- [x] Ajouter la grille du cabinet : 3 practices, 18 rangs fixes, édition grade 1/2, lecture seule sinon, initialisation complète par RPC.
- [x] 42 tests et compilation OK ; deux sélecteurs connectés vérifiés, stagiaire junior uniquement et DA associé/directeur uniquement, motifs visibles, 54 lignes affichées, doublon bloqué, échelon enregistré et relu sans changement, affichage mobile sans débordement.
- [ ] Vérifier l'initialisation réelle sur un cabinet sans grille et la lecture seule avec une session grade > 2 : cabinet disponible déjà complet et session actuelle DM ; aucun cabinet ni compte fictif créé.

## Alignement du front sur les rôles du 02/11/2026
- [x] Aligner les cinq rôles mission/staffing et les libellés DM/CM sans modifier les codes ni les rôles projet.
- [x] Retirer les négociations, conserver Active/Annulée et réserver le retrait à l'associé de la mission.
- [x] 33 tests réussis et compilation OK ; écrans connectés vérifiés : cinq rôles, statut Active, absence de négociation, libellés DM/CM et aucun retrait pour le chef de mission ; contraintes et RPC serveur confirmées en lecture seule.
- [ ] Vérifier une création suivie de sa notification et un retrait par un associé sur un cas métier réel fourni ; aucune affectation RH fictive ni modification de la base effectuée.

## Département du travail et validation DA
- [x] Vérifier les règles serveur déjà installées et actualiser les types ; changement de défaut transactionnel installé et contrôlé.
- [x] Paramétrer les départements, ajouter les choix mission/dossier et retirer les lectures/écritures du champ profil et administration.
- [x] Réserver la validation au DA indépendamment de la notation ; PDF avec historique/validation uniquement en cas de désaccord, signatures conservées.
- [x] 26 tests réussis, deno check et compilation OK ; paramètres enregistrés et relus, choix mission vérifié, fiche fiscale enregistrée et relue, mention d'attente vérifiée pour DM ; export déployé, PDF hébergé 200 rendu avec deux signatures et sans suivi.
- [ ] Vérifier une validation finale DA sur une évaluation ayant reçu les observations : la session disponible est DM, aucun changement RH fictif effectué. Le téléchargement navigateur depuis localhost reste bloqué par les origines autorisées ; génération hébergée authentifiée vérifiée séparément.

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