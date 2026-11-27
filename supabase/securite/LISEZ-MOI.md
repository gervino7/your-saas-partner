# Couche de sécurité de Mission-DGC

Ce dossier garde la **couche de sécurité de la base de données** : qui voit quoi, qui peut écrire quoi, et selon quelles règles. Il s'agit des fonctions, des règles d'accès (RLS), des déclencheurs et des droits.

Pourquoi ce dossier existe : entre septembre et novembre 2026, cette couche a été durcie par une cinquantaine de scripts appliqués directement en production, depuis l'éditeur SQL de Supabase. Ces scripts ne figuraient pas dans `supabase/migrations`. Une restauration depuis une sauvegarde ancienne, ou un nouveau projet monté à partir des migrations, serait donc reparti **sans aucune de ces protections**. C'est le constat E-03 du rapport d'audit de sécurité du 24 novembre 2026.

> **Ne déplacez rien de ce dossier dans `supabase/migrations`.** Les fichiers de `migrations` sont exécutés automatiquement. Ceux-ci doivent être appliqués à la main, au bon moment.

---

## Contenu

| Fichier | Rôle |
|---|---|
| `etat-de-reference-2026-11-26.sql` | **La photographie de la production au 26 novembre 2026** : 261 fonctions, 89 tables sous RLS, 289 règles d'accès, 91 déclencheurs, les droits sur 95 tables et 261 fonctions, 134 contraintes, 11 index uniques. Il se rejoue sans dégât. |
| `scripts/` | Les scripts récents, avec leurs essais, pour savoir **pourquoi** une règle existe. |
| `outils/exporter-la-couche-de-securite.sql` | Produit une nouvelle photographie (lecture seule). |
| `outils/verifier-l-etat-des-scripts.sql` | Vérifie, script par script, ce qui est en place. |

### Les scripts récents

| Script | Ce qu'il pose | Statut au 26/11/2026 |
|---|---|---|
| 50 — Fermer les invitations | Seuls le DA (tout grade) et le DM (MGR et en dessous) de son cabinet, ou l'administrateur de la plateforme, invitent. L'invitation ne vaut que pour l'adresse invitée, et une seule fois. | Appliqué, contrôles OK |
| 51 — Vous seul créez les cabinets | Seul l'administrateur de la plateforme crée un cabinet et invite son premier DA. Les quotas viennent de l'offre. | Appliqué, contrôles OK |
| 52 — Ajouter un membre directement | Le DA et l'administrateur de la plateforme créent un compte avec un mot de passe provisoire, à changer à la première connexion. | Appliqué, contrôles OK |
| 53 — Supprimer un compte sans perdre les traces | Suppression encadrée, fiche archivée, journal inaltérable. | **Bloc 1 en place mais inutilisé.** À revoir : en production, `profiles.organization_id` est obligatoire. Ne pas appliquer le prompt Lovable correspondant avant la révision. |
| 54 — Fermer le portail COPIL | Codes et jetons tirés par le serveur et gardés en empreinte, 5 essais par code, 1 code par minute et 5 par heure, adresse comparée exactement, accès coupé dès qu'un membre est retiré ou que la mission se termine. Va avec la nouvelle fonction `copil-portal-auth`. | **À appliquer avant la fusion de la fonction.** |

---

## Remettre la sécurité en place

Cela peut servir après une restauration depuis une sauvegarde antérieure au 26/11/2026, ou sur un nouveau projet.

1. Appliquez les migrations de `supabase/migrations` : ce sont les tables.
2. Dans l'éditeur SQL de Supabase, exécutez **`etat-de-reference-2026-11-26.sql` en entier**.
   - Il remplace les fonctions, recrée les règles d'accès et les déclencheurs, remet les droits à plat, puis ajoute les contraintes et index qui manquent.
   - Une erreur « relation does not exist » signale une table absente : la migration correspondante manque.
3. Exécutez `outils/verifier-l-etat-des-scripts.sql` et vérifiez que tout est « OK ».
4. Faites un essai à la main : connectez-vous avec un compte de chaque grade et vérifiez ce qu'il voit.

Si la sauvegarde restaurée est **postérieure** au 26/11/2026, elle contient déjà la couche de sécurité. Ne rejouez pas ce fichier, qui pourrait écraser des règles plus récentes.

---

## Tenir ce dossier à jour

À chaque nouveau script de sécurité appliqué en production :

1. Ajoutez le script dans `scripts/` et mettez à jour le tableau ci-dessus.
2. Refaites la photographie : exécutez `outils/exporter-la-couche-de-securite.sql` en changeant la ligne `WHERE n.partie = 1` en 2, 3, etc. La colonne « sur » donne le nombre de parties. Téléchargez chaque partie en CSV, **sans l'ouvrir dans Excel**, puis faites-en un nouveau fichier `etat-de-reference-AAAA-MM-JJ.sql`.
3. Gardez l'ancien fichier de référence tant que le nouveau n'a pas été vérifié.
