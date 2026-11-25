import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import { corsFor, jsonResponse } from '../_shared/strict-cors.ts';
import { reglesNonRespectees } from '../_shared/password-rules.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsFor(req) });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonResponse(req, 401, { error: 'non_authentifie' });

    const url = Deno.env.get('SUPABASE_URL')!;
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData?.user) return jsonResponse(req, 401, { error: 'non_authentifie' });
    const userId = userData.user.id;

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: row } = await admin.from('mots_de_passe_provisoires').select('user_id').eq('user_id', userId).maybeSingle();
    if (!row) return jsonResponse(req, 400, { error: 'rien_a_changer' });

    const body = await req.json().catch(() => ({}));
    const nouveau = typeof body?.nouveau === 'string' ? body.nouveau : '';
    const regles = reglesNonRespectees(nouveau);
    if (regles.length > 0 || nouveau.length > 128) return jsonResponse(req, 400, { error: 'mot_de_passe_faible', regles });

    const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password: nouveau });
    if (updErr) {
      console.error('updateUserById failed', (updErr as { code?: string }).code ?? 'unknown');
      return jsonResponse(req, 500, { error: 'changement_impossible' });
    }

    const { error: delErr } = await admin.from('mots_de_passe_provisoires').delete().eq('user_id', userId);
    if (delErr) {
      console.error('provisional flag delete failed', delErr.code);
      return jsonResponse(req, 500, { error: 'changement_impossible' });
    }

    return jsonResponse(req, 200, { success: true });
  } catch (err) {
    console.error('changer-mot-de-passe-provisoire unexpected error', err instanceof Error ? err.name : 'unknown');
    return jsonResponse(req, 500, { error: 'changement_impossible' });
  }
});
