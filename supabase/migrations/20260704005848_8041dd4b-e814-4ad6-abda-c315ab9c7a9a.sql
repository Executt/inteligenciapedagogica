
DO $$
DECLARE
  new_uid uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'superadmin@edugov.gov.br') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token,
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', new_uid, 'authenticated', 'authenticated',
      'superadmin@edugov.gov.br', crypt('EduGov@Super2026!', gen_salt('bf')),
      now(), now(), now(), '', '', '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Super Admin"}'::jsonb
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), new_uid,
      jsonb_build_object('sub', new_uid::text, 'email', 'superadmin@edugov.gov.br', 'email_verified', true),
      'email', new_uid::text, now(), now(), now());
    INSERT INTO public.user_roles (user_id, role) VALUES (new_uid, 'admin'::public.app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END$$;
