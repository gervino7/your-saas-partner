CREATE OR REPLACE FUNCTION public.set_default_dossier_department(_department_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid; _level integer;
BEGIN
 SELECT organization_id,grade_level INTO _org,_level FROM public.profiles WHERE id=auth.uid();
 IF _org IS NULL OR COALESCE(_level,99)>2 THEN RAISE EXCEPTION 'Accès réservé à la direction'; END IF;
 PERFORM 1 FROM public.organizations WHERE id=_org FOR UPDATE;
 IF NOT EXISTS (SELECT 1 FROM public.departments WHERE id=_department_id AND organization_id=_org AND is_active) THEN RAISE EXCEPTION 'Choisissez un département actif de votre cabinet'; END IF;
 UPDATE public.departments SET is_default_dossier=false,updated_at=now() WHERE organization_id=_org AND is_default_dossier AND id<>_department_id;
 UPDATE public.departments SET is_default_dossier=true,updated_at=now() WHERE id=_department_id AND organization_id=_org;
END;
$$;
REVOKE ALL ON FUNCTION public.set_default_dossier_department(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_default_dossier_department(uuid) TO authenticated,service_role;
COMMENT ON COLUMN public.profiles.departement IS 'DEPRECATED: evaluation department is resolved from mission or fiscal dossier and frozen on opening';