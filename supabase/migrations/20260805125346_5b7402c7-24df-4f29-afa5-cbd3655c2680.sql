DO $$
DECLARE _p uuid; _n int;
BEGIN
  SELECT op.id INTO _p FROM obligation_periods op
   JOIN obligation_document_types dt ON dt.obligation_type_id = op.obligation_type_id
   LIMIT 1;
  BEGIN
    _n := public.generate_period_documents(_p);
    RAISE NOTICE 'period % generated %', _p, _n;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'period % ERROR: %', _p, SQLERRM;
  END;
END $$;