-- ═══════════════════════════════════════════════════════════════════════════
--  MISSION-DGC · EXPORTER LA COUCHE DE SÉCURITÉ — (lecture seule)
-- ═══════════════════════════════════════════════════════════════════════════
--  L'export complet dépasse ce que l'éditeur Supabase laisse télécharger :
--  il est découpé en parties d'environ 200 Ko, et chaque instruction longue
--  en tronçons de 20 000 caractères (colonnes morceau / morceaux). La colonne « sur » dit combien
--  il y en a en tout : inutile d'exécuter les parties au-delà.
--
--  Après l'exécution : Export → Download CSV, et joignez le fichier tel quel
--  (sans l'ouvrir dans Excel).
-- ═══════════════════════════════════════════════════════════════════════════

WITH
fonctions AS (
  SELECT 1 AS ordre, 'fonction' AS type,
         p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS nom,
         pg_get_functiondef(p.oid) || ';' AS ddl
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind IN ('f', 'p')
    AND NOT EXISTS (SELECT 1 FROM pg_depend d                    -- pas les fonctions d'extensions
                    WHERE d.objid = p.oid AND d.deptype = 'e')
    AND p.proname NOT LIKE 'essai\_%'                            -- pas nos fonctions d'essai
),
rls AS (
  SELECT 2, 'rls', c.relname,
         'ALTER TABLE public.' || quote_ident(c.relname) || ' ENABLE ROW LEVEL SECURITY;'
         || CASE WHEN c.relforcerowsecurity
                 THEN E'\nALTER TABLE public.' || quote_ident(c.relname) || ' FORCE ROW LEVEL SECURITY;'
                 ELSE '' END
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relrowsecurity
),
regles AS (
  SELECT 3, 'politique', pol.tablename || ' / ' || pol.policyname,
         'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.' || quote_ident(pol.tablename) || E';\n'
         || 'CREATE POLICY ' || quote_ident(pol.policyname) || ' ON public.' || quote_ident(pol.tablename)
         || ' AS ' || pol.permissive
         || ' FOR ' || pol.cmd
         || ' TO ' || array_to_string(pol.roles, ', ')
         || COALESCE(E'\n  USING (' || pol.qual || ')', '')
         || COALESCE(E'\n  WITH CHECK (' || pol.with_check || ')', '')
         || ';'
  FROM pg_policies pol WHERE pol.schemaname = 'public'
),
declencheurs AS (
  SELECT 4, 'declencheur', c.relname || ' / ' || t.tgname,
         'DROP TRIGGER IF EXISTS ' || quote_ident(t.tgname) || ' ON ' || n.nspname || '.' || quote_ident(c.relname) || E';\n'
         || pg_get_triggerdef(t.oid) || ';'
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE NOT t.tgisinternal
    AND (n.nspname = 'public' OR (n.nspname = 'auth' AND c.relname = 'users'))
),
droits_tables AS (
  SELECT 5, 'droits-table', c.relname,
         'REVOKE ALL ON public.' || quote_ident(c.relname) || ' FROM anon, authenticated;'
         || COALESCE(E'\n' || (
              SELECT string_agg('GRANT ' || g.privs || ' ON public.' || quote_ident(c.relname) || ' TO ' || g.grantee || ';', E'\n')
              FROM (SELECT a.grantee, string_agg(a.privilege_type, ', ' ORDER BY a.privilege_type) AS privs
                    FROM information_schema.role_table_grants a
                    WHERE a.table_schema = 'public' AND a.table_name = c.relname
                      AND a.grantee IN ('anon', 'authenticated')
                    GROUP BY a.grantee) g), '')
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm')
),
droits_fonctions AS (
  SELECT 6, 'droits-fonction',
         p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         'REVOKE ALL ON FUNCTION public.' || quote_ident(p.proname) || '(' || pg_get_function_identity_arguments(p.oid) || ') FROM PUBLIC, anon, authenticated;'
         || CASE WHEN has_function_privilege('anon', p.oid, 'EXECUTE')
                 THEN E'\nGRANT EXECUTE ON FUNCTION public.' || quote_ident(p.proname) || '(' || pg_get_function_identity_arguments(p.oid) || ') TO anon;' ELSE '' END
         || CASE WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE')
                 THEN E'\nGRANT EXECUTE ON FUNCTION public.' || quote_ident(p.proname) || '(' || pg_get_function_identity_arguments(p.oid) || ') TO authenticated;' ELSE '' END
         || CASE WHEN has_function_privilege('service_role', p.oid, 'EXECUTE')
                 THEN E'\nGRANT EXECUTE ON FUNCTION public.' || quote_ident(p.proname) || '(' || pg_get_function_identity_arguments(p.oid) || ') TO service_role;' ELSE '' END
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
    AND p.proname NOT LIKE 'essai\_%'
),
colonnes_calculees AS (
  SELECT 7, 'colonne-calculee', c.relname || '.' || a.attname,
         '-- ' || c.relname || '.' || a.attname || ' = ' || pg_get_expr(d.adbin, d.adrelid)
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE n.nspname = 'public' AND a.attgenerated = 's'
),
contraintes AS (
  SELECT 8, 'contrainte', c.relname || ' / ' || con.conname,
         'ALTER TABLE public.' || quote_ident(c.relname) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(con.conname) || E';\n'
         || 'ALTER TABLE public.' || quote_ident(c.relname) || ' ADD CONSTRAINT ' || quote_ident(con.conname) || ' ' || pg_get_constraintdef(con.oid) || ';'
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND con.contype IN ('c', 'u', 'x')
),
index_uniques AS (
  SELECT 9, 'index-unique', i.relname, pg_get_indexdef(i.oid) || ';'
  FROM pg_index x
  JOIN pg_class i ON i.oid = x.indexrelid
  JOIN pg_class c ON c.oid = x.indrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND x.indisunique AND NOT x.indisprimary
    AND NOT EXISTS (SELECT 1 FROM pg_constraint con WHERE con.conindid = x.indexrelid)
),
tout AS (
  SELECT * FROM fonctions          UNION ALL
  SELECT * FROM rls                UNION ALL
  SELECT * FROM regles             UNION ALL
  SELECT * FROM declencheurs       UNION ALL
  SELECT * FROM droits_tables      UNION ALL
  SELECT * FROM droits_fonctions   UNION ALL
  SELECT * FROM colonnes_calculees UNION ALL
  SELECT * FROM contraintes        UNION ALL
  SELECT * FROM index_uniques
),
numerote AS (
  SELECT t.*, 1 + floor(sum(octet_length(ddl)) OVER (ORDER BY ordre, nom ROWS UNBOUNDED PRECEDING) / 200000)::int AS partie
  FROM tout t
)
SELECT n.partie, (SELECT max(partie) FROM numerote) AS sur, n.ordre, n.type, n.nom,
       m.i AS morceau, ceil(length(n.ddl) / 20000.0)::int AS morceaux,
       substr(n.ddl, (m.i - 1) * 20000 + 1, 20000) AS ddl
FROM numerote n
CROSS JOIN LATERAL generate_series(1, greatest(1, ceil(length(n.ddl) / 20000.0)::int)) AS m(i)
WHERE n.partie = 1
ORDER BY n.ordre, n.nom, m.i;
