import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import { corsFor, jsonResponse } from '../_shared/strict-cors.ts';

const GRADES = new Set(['DA', 'DM', 'MGR', 'SUP', 'AS', 'AUD', 'AJ', 'STG']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const ALL = UPPER + LOWER + DIGITS;

function randIndex(max: number): number {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % max;
}

function motDePasseProvisoire(): string {
  const chars = [UPPER[randIndex(UPPER.length)], LOWER[randIndex(LOWER.length)], DIGITS[randIndex(DIGITS.length)]];
  while (chars.length < 14) chars.push(ALL[randIndex(ALL.length)]);
  for (let i = chars.length - 1; i > 0; i--) { const j = randIndex(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join('');
}

function jetonHex(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsFor(req) });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonResponse(req, 401, { error: 'non_authentifie' });

    const url = Deno.env.get('SUPABASE_URL')!;
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData?.user) return jsonResponse(req, 401, { error: 'non_authentifie' });
    const callerId = userData.user.id;

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : '';
    const grade = typeof body?.grade === 'string' ? body.grade.trim() : '';

    const { data: callerProfile } = await admin.from('profiles').select('organization_id').eq('id', callerId).maybeSingle();
    const requestedOrg = typeof body?.organization_id === 'string' && body.organization_id ? body.organization_id : null;
    const organizationId: string | null = requestedOrg ?? callerProfile?.organization_id ?? null;
    if (!organizationId || !GRADES.has(grade)) return jsonResponse(req, 400, { error: 'donnees_invalides' });

    const { data: autorise, error: rpcErr } = await caller.rpc('peut_ajouter_directement', { _organization_id: organizationId, _grade: grade });
    if (rpcErr) console.error('peut_ajouter_directement failed', rpcErr.code);
    if (autorise !== true) return jsonResponse(req, 403, { error: 'interdit' });

    if (!EMAIL_RE.test(email) || email.length > 255 || fullName.length < 2 || fullName.length > 200) {
      return jsonResponse(req, 400, { error: 'donnees_invalides' });
    }

    const { data: existing } = await admin.from('profiles').select('id').ilike('email', email).limit(1);
    if (existing && existing.length > 0) return jsonResponse(req, 409, { error: 'adresse_deja_utilisee' });

    const { data: org } = await admin.from('organizations').select('name, max_users').eq('id', organizationId).maybeSingle();
    if (!org) return jsonResponse(req, 400, { error: 'donnees_invalides' });
    const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId);
    if (org.max_users != null && (count ?? 0) >= Number(org.max_users)) return jsonResponse(req, 409, { error: 'quota_atteint' });

    const token = jetonHex();
    const { data: inv, error: invErr } = await admin.from('invitations')
      .insert({ organization_id: organizationId, email, grade, invited_by: callerId, token })
      .select('id').single();
    if (invErr || !inv) {
      console.error('invitation insert failed', invErr?.code);
      return jsonResponse(req, 500, { error: 'ajout_impossible' });
    }

    const provisoire = motDePasseProvisoire();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password: provisoire, email_confirm: true,
      user_metadata: { full_name: fullName, invitation_token: token },
    });
    if (createErr || !created?.user) {
      await admin.from('invitations').delete().eq('id', inv.id);
      const code = (createErr as { code?: string } | null)?.code ?? '';
      if (code === 'email_exists') return jsonResponse(req, 409, { error: 'adresse_deja_utilisee' });
      console.error('createUser failed', code || 'unknown');
      return jsonResponse(req, 500, { error: 'ajout_impossible' });
    }

    const userId = created.user.id;
    const { data: profile } = await admin.from('profiles').select('organization_id, grade').eq('id', userId).maybeSingle();
    if (profile?.organization_id !== organizationId || profile?.grade !== grade) {
      console.error('profile mismatch after direct add', userId);
      await admin.auth.admin.deleteUser(userId);
      await admin.from('invitations').delete().eq('id', inv.id);
      return jsonResponse(req, 500, { error: 'ajout_impossible' });
    }

    const { error: mppErr } = await admin.from('mots_de_passe_provisoires').insert({ user_id: userId, cree_par: callerId });
    if (mppErr) {
      console.error('provisional flag insert failed', mppErr.code);
      await admin.auth.admin.deleteUser(userId);
      await admin.from('invitations').delete().eq('id', inv.id);
      return jsonResponse(req, 500, { error: 'ajout_impossible' });
    }

    if (callerProfile?.organization_id !== organizationId) {
      const { data: isAdmin } = await caller.rpc('is_platform_admin', { _min_role: 'support' } as never);
      if (isAdmin) {
        const { error: logErr } = await caller.rpc('log_super_admin_action', {
          _action: 'member_added', _target_type: 'organization', _target_id: organizationId,
          _target_label: org.name, _details: { email, grade },
        });
        if (logErr) console.error('log_super_admin_action failed', logErr.code);
      }
    }

    return jsonResponse(req, 200, { success: true, mot_de_passe_provisoire: provisoire });
  } catch (err) {
    console.error('ajouter-membre unexpected error', err instanceof Error ? err.name : 'unknown');
    return jsonResponse(req, 500, { error: 'ajout_impossible' });
  }
});
