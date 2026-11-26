-- ═══════════════════════════════════════════════════════════════════════════
--  MISSION-DGC · ÉTAT DES SCRIPTS — CE QUI EST POSÉ, CE QUI NE L'EST PAS
--  Lecture seule. Rien n'est modifié par ce fichier.
-- ═══════════════════════════════════════════════════════════════════════════
--  Chaque script laisse une signature en base : une fonction, une politique,
--  une contrainte. Ce fichier les cherche et vous dit, sans que vous ayez à
--  vous souvenir, lesquels sont passés.
-- ═══════════════════════════════════════════════════════════════════════════

SELECT script AS "Script", ce_qu_il_pose AS "Ce qu'il pose",
       CASE WHEN pose THEN 'pose' ELSE '**a faire**' END AS "Etat"
FROM (VALUES

  ('correctif-30a', 'Une mission peut etre supprimee',
   (SELECT COALESCE((SELECT prosrc FROM pg_proc WHERE proname='dossier_systeme_protege' LIMIT 1), '')
      ~ 'n''existe deja plus')),

  ('evaluation-32',  'L''onglet documents partages est retire de la base',
   NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                WHERE n.nspname='public' AND p.proname='get_client_shared_documents')),

  ('evaluation-38',  'Le statut « Annulee » existe',
   (SELECT COALESCE((SELECT pg_get_constraintdef(oid) FROM pg_constraint
                      WHERE conname='missions_status_check'), '') ~ 'cancelled')),

  ('evaluation-39',  'La grille revient au directeur associe',
   EXISTS (SELECT 1 FROM pg_policies WHERE tablename='evaluation_grades'
            AND policyname='grille_par_le_da')),

  ('evaluation-40',  'Le code CM est devenu MGR',
   NOT EXISTS (SELECT 1 FROM pg_constraint
                WHERE conname='profiles_grade_check' AND pg_get_constraintdef(oid) ~ '''CM''')),

  ('evaluation-41',  'Le Manager domine le Superviseur',
   COALESCE((SELECT (regexp_match(e.expr, 'WHEN ''MGR''(?:::text)?\s+THEN\s+(\d+)'))[1]::int
                  < (regexp_match(e.expr, 'WHEN ''SUP''(?:::text)?\s+THEN\s+(\d+)'))[1]::int
             FROM (SELECT COALESCE(
               (SELECT pg_get_expr(d.adbin, d.adrelid) FROM pg_attrdef d
                JOIN pg_class cl ON cl.oid=d.adrelid JOIN pg_namespace n ON n.oid=cl.relnamespace
                JOIN pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum
                WHERE n.nspname='public' AND cl.relname='profiles' AND a.attname='grade_level'),
               (SELECT (regexp_match(p.prosrc, 'NEW\.grade_level := \((.*?)\);\s*RETURN'))[1]
                FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                WHERE n.nspname='public' AND p.proname='calculer_profiles_grade_level')) AS expr) e),
            false)),

  ('evaluation-42',  'La disponibilite renvoie l''identifiant',
   to_regprocedure('public.disponibilite(date,date)') IS NOT NULL
   AND pg_get_function_result('public.disponibilite(date,date)'::regprocedure) ~ 'collaborateur_id'),

  ('correctif-42a',  'Nos fonctions sont fermees au role anon',
   to_regprocedure('public.disponibilite(date,date)') IS NOT NULL
   AND NOT has_function_privilege('anon','public.disponibilite(date,date)','EXECUTE')),

  ('correctif-42b',  'Les fonctions de purge sont fermees au role anon',
   NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                WHERE n.nspname='public'
                  AND p.proname IN ('purge_old_activity_data','purge_old_attendance',
                                    'expire_portal_invitations')
                  AND has_function_privilege('anon', p.oid, 'EXECUTE'))),

  ('evaluation-43',  'Les quatre collaborateurs sont assis sur leur echelon',
   NOT EXISTS (
     SELECT 1 FROM profiles p
     WHERE p.grade_echelon IS NOT NULL
       AND EXISTS (SELECT 1 FROM evaluation_grades g
                    WHERE g.organization_id = p.organization_id AND g.practice = p.practice
                      AND lower(btrim(g.echelon)) = lower(btrim(p.grade_echelon))
                      AND g.maps_to_grade <> p.grade))),

  ('evaluation-44',  'Le budget ne depend plus que du role de mission',
   (SELECT COALESCE((SELECT prosrc FROM pg_proc WHERE proname='peut_voir_le_budget' LIMIT 1), 'has_role')
      !~ 'has_role')),

  ('evaluation-45',  'La disponibilite ne nomme pas les missions des autres',
   (SELECT COALESCE((SELECT prosrc FROM pg_proc WHERE proname='disponibilite' LIMIT 1), '')
      ~ 'hors de votre portee')),

  ('correctif-28a',  'Les fichiers restent accessibles (chaine du portail)',
   NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage'
                AND COALESCE(qual,'') ~ 'current_portal_client')),

  ('evaluation-28',  'Le portail client est ferme en base',
   NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='portal_users')),

  ('evaluation-29',  'Le metier est detache du portail',
   to_regprocedure('public.rattacher_piece_a_obligation(uuid,text,text,text,text)') IS NOT NULL)

) AS t(script, ce_qu_il_pose, pose)
ORDER BY pose, script;


-- ═══════════════════════════════════════════════════════════════════════════
--  LES PETITES DETTES
-- ═══════════════════════════════════════════════════════════════════════════

SELECT sujet AS "Sujet", etat AS "Etat"
FROM (VALUES
  ('La table timesheets, doublon vide',
   CASE WHEN NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='timesheets')
        THEN 'supprimee'
        ELSE (SELECT count(*)::text FROM public.timesheets)||' ligne(s) — rien ne la lit' END),
  ('Missions sans associe dans leur equipe',
   (SELECT count(*)::text FROM missions m
     WHERE m.status <> 'cancelled'
       AND NOT EXISTS (SELECT 1 FROM mission_members mm
                        WHERE mm.mission_id = m.id AND mm.role = 'associe'))),
  ('Collaborateurs sans echelon',
   (SELECT count(*)::text FROM profiles WHERE grade_echelon IS NULL)),
  ('Collaborateurs dont le grade contredit l''echelon',
   (SELECT count(*)::text FROM profiles p
     WHERE p.grade_echelon IS NOT NULL
       AND EXISTS (SELECT 1 FROM evaluation_grades g
                    WHERE g.organization_id = p.organization_id AND g.practice = p.practice
                      AND lower(btrim(g.echelon)) = lower(btrim(p.grade_echelon))
                      AND g.maps_to_grade <> p.grade))),
  ('Budgets enregistres',
   (SELECT count(*)::text FROM mission_budgets WHERE amount IS NOT NULL)),
  ('Taux journaliers officiels',
   (SELECT count(*)::text FROM daily_rates))
) AS t(sujet, etat) ORDER BY sujet;
