import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import { sendResend } from '../_shared/email-template.ts';
import { corsFor, jsonResponse, escapeHtml } from '../_shared/strict-cors.ts';

const APP_URL = 'https://mamission.abodje.com';

const GRADE_LABELS: Record<string, string> = {
  DA: 'Directeur Associé', DM: 'Directeur de Mission', MGR: 'Manager',
  SUP: 'Superviseur', SEN: 'Auditeur Senior', AUD: 'Auditeur',
  JUN: 'Auditeur Junior', STG: 'Stagiaire',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsFor(req) });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonResponse(req, 401, { error: 'non_authentifie' });

    const url = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const callerId = userData?.user?.id;
    if (userErr || !callerId) return jsonResponse(req, 401, { error: 'non_authentifie' });

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    if (!token) return jsonResponse(req, 403, { error: 'interdit' });

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: inv } = await admin
      .from('invitations')
      .select('email, grade, status, expires_at, invited_by, organization_id, organizations(name)')
      .eq('token', token)
      .maybeSingle();

    const expired = inv?.expires_at ? new Date(inv.expires_at).getTime() < Date.now() : false;
    if (!inv || inv.status !== 'pending' || expired || inv.invited_by !== callerId) {
      return jsonResponse(req, 403, { error: 'interdit' });
    }

    const orgRel = (inv as { organizations?: { name?: string } | { name?: string }[] }).organizations;
    const orgNameRaw = (Array.isArray(orgRel) ? orgRel[0]?.name : orgRel?.name) || 'Mission-DGC';
    const orgName = escapeHtml(orgNameRaw);
    const gradeLabel = escapeHtml(GRADE_LABELS[inv.grade ?? ''] ?? inv.grade ?? 'Membre');
    const inviteLink = `${APP_URL}/register?token=${encodeURIComponent(token)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #16519C; color: #ffffff; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="margin: 0;">Mission-DGC</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
          <h3 style="margin-top: 0;">Vous êtes invité(e) à rejoindre ${orgName}</h3>
          <p>Bonjour,</p>
          <p>Vous avez été invité(e) à rejoindre le cabinet <strong>${orgName}</strong> sur Mission-DGC en tant que <strong>${gradeLabel}</strong>.</p>
          <p>Cliquez sur le bouton ci-dessous pour créer votre compte :</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteLink}" style="background: #E67433; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Accepter l'invitation</a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Ce lien expire dans 7 jours. Si vous n'attendiez pas cette invitation, ignorez ce courriel.</p>
        </div>
      </div>`;

    const result = await sendResend({
      to: inv.email,
      subject: `Invitation à rejoindre ${orgNameRaw} sur Mission-DGC`,
      html,
    });
    if (!result.ok) {
      console.error('send-invitation: email provider refused');
      return jsonResponse(req, 502, { error: 'envoi_impossible' });
    }
    return jsonResponse(req, 200, { success: true });
  } catch (err) {
    console.error('send-invitation unexpected error', err instanceof Error ? err.name : 'unknown');
    return jsonResponse(req, 500, { error: 'envoi_impossible' });
  }
});
