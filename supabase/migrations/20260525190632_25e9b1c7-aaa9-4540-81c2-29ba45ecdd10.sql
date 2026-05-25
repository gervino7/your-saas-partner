-- Create a temporary auth user, fire trigger, then rollback via exception
DO $$
DECLARE
  _uid uuid := gen_random_uuid();
  _err text;
BEGIN
  BEGIN
    INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role, instance_id)
    VALUES (_uid, 'diag_'||_uid||'@x.com', '{"full_name":"Diag Test"}'::jsonb, 'authenticated','authenticated','00000000-0000-0000-0000-000000000000');
    DELETE FROM auth.users WHERE id=_uid;
    RAISE NOTICE 'OK signup simulated successfully';
  EXCEPTION WHEN OTHERS THEN
    _err := SQLERRM;
    RAISE NOTICE 'FAILED: %', _err;
  END;
END $$;