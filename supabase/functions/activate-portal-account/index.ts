import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';

const ALLOWED_ORIGINS = [
  'https://mamission.abodje.com',
  'https://missionpro.lovable.app',
];

function cors(origin: string | null) {
  const allowed = origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.lovable.app') || origin.startsWith('http://localhost'))
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

function validatePassword(pwd: unknown): string | null {
  if (typeof pwd !== 'string' || pwd.length < 10) {
    return 'Le mot de passe doit contenir au moins 10 caractères.';
  }
  if (!/[a-zA-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
    return 'Le mot de passe doit contenir au moins une lettre et un chiffre.';
  }
  return null;
}

Deno.serve(async (req) => {
  const headers = { ...cors(req.headers.get('origin')), 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req.headers.get('origin')) });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const { token, password, full_name, validate_only } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Lien invalide' }), { status: 400, headers });
    }

    const { data: validation, error: validationError } = await admin.rpc('portal_validate_invitation', { _token: token });
    if (validationError) {
      console.error('portal_validate_invitation error:', validationError.message);
      return new Response(JSON.stringify({ error: validationError.message }), { status: 400, headers });
    }

    const invitation = validation as {
      valid: boolean; reason?: string; email: string; full_name: string | null;
      client_name: string; organization_name: string;
    };

    if (!invitation?.valid) {
      return new Response(JSON.stringify({ error: invitation?.reason ?? 'Lien invalide' }), { status: 400, headers });
    }

    if (validate_only) {
      return new Response(JSON.stringify({
        valid: true,
        email: invitation.email,
        full_name: invitation.full_name,
        client_name: invitation.client_name,
        organization_name: invitation.organization_name,
      }), { headers });
    }

    console.log('[activate] password provided:', !!password);

    const pwdError = validatePassword(password);
    if (pwdError) {
      return new Response(JSON.stringify({ error: pwdError }), { status: 400, headers });
    }

    const metadata = { account_type: 'portal_client', full_name: full_name || invitation.full_name || '' };

    let userId: string | null = null;
    let createdNow = false;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (created?.user && !createError) {
      userId = created.user.id;
      createdNow = true;
      console.log('[activate] auth user created', userId);
    } else {
      const msg = (createError?.message ?? '').toLowerCase();
      const alreadyExists = msg.includes('already') || msg.includes('exists') || msg.includes('registered');
      console.error('[activate] createUser error:', createError?.message);

      if (!alreadyExists) {
        return new Response(JSON.stringify({ error: "Impossible de créer le compte. Veuillez réessayer." }), { status: 400, headers });
      }

      // A previous activation attempt left an auth user behind (or the invitation was retried).
      // The invitation token is still valid, so it is safe to (re)set the password on that account.
      const { data: existing, error: lookupError } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const match = existing?.users?.find(
        (u) => (u.email ?? '').toLowerCase() === invitation.email.toLowerCase(),
      );

      if (lookupError || !match) {
        console.error('[activate] existing user lookup failed:', lookupError?.message);
        return new Response(JSON.stringify({ error: 'Un compte existe déjà pour cette adresse email.' }), { status: 400, headers });
      }

      const { error: updateError } = await admin.auth.admin.updateUserById(match.id, {
        password,
        email_confirm: true,
        user_metadata: { ...(match.user_metadata ?? {}), ...metadata },
      });

      if (updateError) {
        console.error('[activate] updateUserById error:', updateError.message);
        return new Response(JSON.stringify({ error: "Impossible de définir votre mot de passe. Contactez votre cabinet." }), { status: 400, headers });
      }

      userId = match.id;
      console.log('[activate] existing auth user password reset', userId);
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Impossible de créer le compte. Veuillez réessayer." }), { status: 400, headers });
    }

    const { data: accepted, error: acceptError } = await admin.rpc('portal_accept_invitation', {
      _token: token,
      _auth_user_id: created.user.id,
    });

    const acceptFailed = acceptError || (accepted && (accepted as { success?: boolean }).success === false);

    if (acceptFailed) {
      console.error('portal_accept_invitation error:', acceptError?.message ?? JSON.stringify(accepted));
      await admin.auth.admin.deleteUser(created.user.id);
      const reason = acceptError?.message ?? (accepted as { reason?: string })?.reason ?? "L'activation a échoué. Veuillez réessayer.";
      return new Response(JSON.stringify({ error: reason }), { status: 400, headers });
    }

    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (err) {
    console.error('activate-portal-account error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers });
  }
});
