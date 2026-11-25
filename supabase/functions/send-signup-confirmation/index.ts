import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import { corsFor, jsonResponse } from '../_shared/strict-cors.ts';

function reglesNonRespectees(pwd: string): string[] {
  const r: string[] = [];
  if (pwd.length < 8) r.push('Au moins 8 caractères');
  if (!/[A-Z]/.test(pwd)) r.push('Une lettre majuscule');
  if (!/[a-z]/.test(pwd)) r.push('Une lettre minuscule');
  if (!/[0-9]/.test(pwd)) r.push('Un chiffre');
  return r;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsFor(req) });

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : '';
    const token = typeof body?.invitation_token === 'string' ? body.invitation_token.trim() : '';

    if (!token || !email || !password) return jsonResponse(req, 400, { error: 'invitation_invalide' });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: inv, error: invErr } = await admin.rpc('invitation_utilisable', { _jeton: token, _email: email });
    if (invErr) console.error('invitation_utilisable failed', invErr.code);
    const invitation = Array.isArray(inv) ? inv[0] : null;
    if (!invitation?.organization_id) return jsonResponse(req, 400, { error: 'invitation_invalide' });

    const regles = reglesNonRespectees(password);
    if (regles.length > 0) return jsonResponse(req, 400, { error: 'mot_de_passe_faible', regles });

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, invitation_token: token },
    });

    if (createErr || !created?.user) {
      const code = (createErr as { code?: string } | null)?.code ?? '';
      const msg = createErr?.message?.toLowerCase() ?? '';
      if (code === 'email_exists' || msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        return jsonResponse(req, 409, { error: 'already_registered' });
      }
      console.error('createUser failed', code || 'unknown');
      return jsonResponse(req, 500, { error: 'inscription_impossible' });
    }

    const userId = created.user.id;
    const { data: profile } = await admin.from('profiles').select('organization_id').eq('id', userId).maybeSingle();
    if (profile?.organization_id !== invitation.organization_id) {
      console.error('profile not attached to invitation organization', userId);
      await admin.auth.admin.deleteUser(userId);
      return jsonResponse(req, 500, { error: 'inscription_impossible' });
    }

    return jsonResponse(req, 200, { success: true });
  } catch (err) {
    console.error('send-signup-confirmation unexpected error', err instanceof Error ? err.name : 'unknown');
    return jsonResponse(req, 500, { error: 'inscription_impossible' });
  }
});
