# Architecture rules

- Evaluation PDFs are generated only in the export-evaluation-pdf edge function using caller-authorized RPC data; client score previews are provisional and server scores remain authoritative.
- Evaluation archives use RPC-derived audience variants and authenticated encryption bound to the storage path; organization-level storage access must not reveal confidential feedback.
- Keep the uploaded function's explicit JWT gateway verification enabled and additionally validate the caller in code; RPCs remain the sole source of evaluation permissions.
- Evaluation UI uses feature components and RPC hooks for workflow and evaluation reads; score upserts, profile/reference reads and the export journal use authorized tables, while cabinet settings use transactional RPCs to preserve the server-controlled circuit.
- The evaluation form renders its category and subcriterion columns through the feature EvaluationGrid component to keep rating controls separate from weighted results.
- Evaluation category display suppresses incomplete averages without changing authoritative scoring; appreciation graphics use RPC-provided scale thresholds.
- Accounting dossier evaluations reuse mission-type workflows and RPC-derived practice/exercise; their fiscal-tab controls only mirror server permissions, preserving one scoring pipeline.
- Department selectors share the organization-scoped reference hook; default dossier changes use a serialized transactional RPC to preserve exclusivity.
- Validation eligibility is displayed independently from score editing; server workflow RPCs enforce grade and observation prerequisites.
- Mission and staffing role selectors share RPC-derived eligibility and membership predicates; database defaults and RPCs remain authoritative for activation and removal to prevent client-side permission drift.
- Cabinet echelon grids use organization-scoped authorized reference tables and server seeding; fixed rank keys and client validation mirror existing RLS without introducing cross-cabinet administration.- Mission document folders and per-folder rights come only from the dossiers_de_la_mission RPC; the front never re-derives the access matrix, and deletions remove the row before the storage object so a refused delete leaves no orphan.
- Timesheet task choices, availability and day occupancy come only from the taches_imputables, disponibilite and occupation_du_jour RPCs, and approval buttons follow est_directeur_associe; the database enforces elementary-action rules and the UI shows its messages verbatim.
- Mission budgets appear only in Finances, read through budgets_du_cabinet with the Fixer action gated by its peut_le_fixer flag; mission pages never mention money, and budget upserts must return a row or fail loudly.
- Evaluator designation is DA-only and goes through assign_evaluator/retirer_designation; mission scope filters candidates by mission role (lib/designation mirrors it for display only), annual and dossier scopes by grade.
- Promotions go only through promouvoir_collaborateur with options from echelons_promouvables (DA-only button via est_directeur_associe); the Parcours tab reads grade_history under RLS, empty meaning no right.
- Timesheet Validation and Disponibilité tabs open only on what the database returns (pending submitted entries, other collaborators in disponibilite); project-less general tasks are created from the weekly tab by grade levels 1-3, matching the tasks insert policy.
- Finance reads rates only from daily_rates and budgets only from mission_budgets under RLS, with no fallback values; zero rows means reserved (message), never zero amounts.
- Accounts are created only from invitations: signup goes through send-signup-confirmation (server-side invitation and password checks, no confirmation email), cabinets only through super_admin_creer_cabinet, and send-invitation builds emails solely from the stored invitation of its caller.

- Direct member creation goes only through the ajouter-membre function (permission from peut_ajouter_directement, one-time provisional password); AuthGuard forces /changer-mot-de-passe while mon_mot_de_passe_est_provisoire is true, and only changer-mot-de-passe-provisoire changes the password and clears the flag.
- The database security layer is documented in supabase/securite (reference snapshot, scripts, tools); it is applied manually and must never be moved into supabase/migrations, and any new security script must be added there with an updated reference snapshot.
