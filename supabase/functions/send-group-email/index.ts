// Courriel groupé d'un comité ou d'une liste de diffusion.
//
// N'envoie que ses propres courriels : l'appelant doit en être l'auteur
// (group_emails.sent_by), appartenir au cabinet de la liste, et le courriel ne
// doit pas être déjà parti. Les pièces jointes ne peuvent être que des fichiers
// déposés par l'éditeur de courriel dans le cabinet de l'appelant
// (<cabinet>/email-attachments/...). Sujet et corps sont échappés.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import { sendResend } from '../_shared/email-template.ts';
import { corsFor, escapeHtml, jsonResponse } from '../_shared/strict-cors.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Recipient = { name: string; email: string };
type Attachment = { name?: string; file_path?: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsFor(req) });
  }
  if (req.method !== 'POST') {
    return jsonResponse(req, 405, { error: 'Méthode non autorisée' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  try {
    // ── L'appelant ──────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse(req, 401, { error: 'non_authentifie' });
    }
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const callerId = userData?.user?.id;
    if (userErr || !callerId) {
      return jsonResponse(req, 401, { error: 'non_authentifie' });
    }

    const body = await req.json().catch(() => ({}));
    const emailId = typeof body?.emailId === 'string' ? body.emailId : '';
    if (!UUID.test(emailId)) {
      return jsonResponse(req, 400, { error: 'donnees_invalides' });
    }

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: caller } = await admin
      .from('profiles')
      .select('organization_id')
      .eq('id', callerId)
      .single();
    const callerOrg: string | null = caller?.organization_id ?? null;
    if (!callerOrg) {
      return jsonResponse(req, 403, { error: 'interdit' });
    }

    // ── Le courriel et sa liste ─────────────────────────────────────────
    const { data: email } = await admin
      .from('group_emails')
      .select('id, subject, body, sent_by, status, attachments, mailing_groups(id, organization_id, committee_id, mailing_group_recipients(name, email), committees(name, mission_id, missions(organization_id)))')
      .eq('id', emailId)
      .single();

    // Inconnu ou pas à l'appelant : même réponse.
    if (!email || email.sent_by !== callerId) {
      return jsonResponse(req, 403, { error: 'interdit' });
    }

    // deno-lint-ignore no-explicit-any
    const group: any = email.mailing_groups;
    const groupOrg: string | null =
      group?.organization_id ?? group?.committees?.missions?.organization_id ?? null;
    if (!group || groupOrg !== callerOrg) {
      return jsonResponse(req, 403, { error: 'interdit' });
    }

    // Un courriel déjà parti ou en cours ne repart pas.
    if (!['draft', 'error'].includes(String(email.status ?? 'draft'))) {
      return jsonResponse(req, 409, { error: 'deja_envoye' });
    }

    // ── Les pièces jointes : seulement celles du cabinet de l'appelant ─
    const prefixe = `${callerOrg}/email-attachments/`;
    const pieces: Attachment[] = Array.isArray(email.attachments) ? email.attachments : [];
    for (const att of pieces) {
      const chemin = String(att?.file_path ?? '');
      if (!chemin.startsWith(prefixe) || chemin.includes('..')) {
        return jsonResponse(req, 403, { error: 'piece_jointe_interdite' });
      }
    }

    // ── Les destinataires ──────────────────────────────────────────────
    const allRecipients: Recipient[] = [];
    const ajouter = (name: unknown, adresse: unknown) => {
      const e = String(adresse ?? '').trim().toLowerCase();
      if (EMAIL.test(e) && !allRecipients.some((r) => r.email === e)) {
        allRecipients.push({ name: String(name ?? ''), email: e });
      }
    };

    if (group.committee_id) {
      const { data: members } = await admin
        .from('committee_members')
        .select('is_external, external_name, external_email, profiles:user_id(full_name, email, organization_id)')
        .eq('committee_id', group.committee_id);
      for (const m of members ?? []) {
        // deno-lint-ignore no-explicit-any
        const p: any = m.profiles;
        if (m.is_external) {
          ajouter(m.external_name, m.external_email);
        } else if (p?.email && p.organization_id === callerOrg) {
          ajouter(p.full_name, p.email);
        }
      }
    }
    for (const r of group.mailing_group_recipients ?? []) {
      ajouter(r.name, r.email);
    }

    if (allRecipients.length === 0) {
      await admin.from('group_emails')
        .update({ status: 'error', delivery_report: { error: 'Aucun destinataire' } })
        .eq('id', emailId);
      return jsonResponse(req, 400, { error: 'aucun_destinataire' });
    }

    await admin.from('group_emails')
      .update({ status: 'sending', sent_at: new Date().toISOString() })
      .eq('id', emailId);

    // Liens signés pour les pièces jointes (1 heure, le temps de l'envoi)
    const emailAttachments: { filename: string; path: string }[] = [];
    for (const att of pieces) {
      const { data: signed } = await admin.storage
        .from('documents')
        .createSignedUrl(String(att.file_path), 3600);
      if (signed?.signedUrl) {
        emailAttachments.push({ filename: String(att.name || 'piece-jointe'), path: signed.signedUrl });
      }
    }

    const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Mission-DGC</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          ${escapeHtml(String(email.body ?? '')).replace(/\n/g, '<br>')}
        </div>
        <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 16px;">
          Envoyé via Mission-DGC
        </p>
      </div>`;
    const subject = String(email.subject ?? '').replace(/[\r\n]+/g, ' ').slice(0, 250);

    // ── L'envoi, au rythme permis par Resend (2 par seconde) ────────────
    // deno-lint-ignore no-explicit-any
    const deliveryReport: Record<string, any> = {};
    for (let i = 0; i < allRecipients.length; i++) {
      const recipient = allRecipients[i];
      if (i > 0) await new Promise((r) => setTimeout(r, 600));
      try {
        const result = await sendResend({
          to: recipient.email,
          subject,
          html,
          attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
        });
        deliveryReport[recipient.email] = result.ok
          ? { status: 'sent', resend_id: result.id, name: recipient.name, timestamp: new Date().toISOString() }
          : { status: 'error', error: 'envoi_refuse', name: recipient.name };
      } catch (_e) {
        deliveryReport[recipient.email] = { status: 'error', error: 'envoi_impossible', name: recipient.name };
      }
    }

    const sentCount = Object.values(deliveryReport).filter((r) => r.status === 'sent').length;
    const errorCount = allRecipients.length - sentCount;

    await admin.from('group_emails').update({
      status: errorCount === 0 ? 'sent' : 'error',
      delivery_report: deliveryReport,
    }).eq('id', emailId);

    console.log(`send-group-email: ${sentCount} envoyé(s), ${errorCount} échec(s)`);

    return jsonResponse(req, errorCount > 0 && sentCount === 0 ? 502 : 200, {
      success: errorCount === 0,
      recipients: allRecipients.length,
      sent: sentCount,
      errors: errorCount,
      deliveryReport,
    });
  } catch (_e) {
    console.error('send-group-email: erreur interne');
    return jsonResponse(req, 500, { error: 'erreur_interne' });
  }
});
