import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import { buildEmailHtml, sendResend } from '../_shared/email-template.ts';

const APP_URL = Deno.env.get('APP_URL') || 'https://mamission.abodje.com';

const ALLOWED_ORIGINS = [
  'https://mamission.abodje.com',
  'https://missionpro.lovable.app',
  'https://id-preview--48053639-f024-48f2-9a7f-481753672501.lovable.app',
];

function cors(origin: string | null) {
  const allowed = origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.lovable.app'))
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  const headers = { ...cors(req.headers.get('origin')), 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req.headers.get('origin')) });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentification requise' }), { status: 401, headers });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentification requise' }), { status: 401, headers });
    }

    const body = await req.json();
    const obligationPeriodId = String(body.obligation_period_id ?? '');
    const toEmail = String(body.to_email ?? '').trim().toLowerCase();
    const ccEmails: string[] = Array.isArray(body.cc_emails)
      ? body.cc_emails.map((e: string) => String(e).trim().toLowerCase()).filter(Boolean)
      : [];
    const subject = String(body.subject ?? '').trim();
    const message = String(body.message ?? '').trim();
    const canal = String(body.canal ?? 'email');

    if (!obligationPeriodId) {
      return new Response(JSON.stringify({ error: 'obligation_period_id requis' }), { status: 400, headers });
    }
    if (!EMAIL_RE.test(toEmail)) {
      return new Response(JSON.stringify({ error: 'Adresse email du destinataire invalide' }), { status: 400, headers });
    }
    const badCc = ccEmails.find((e) => !EMAIL_RE.test(e));
    if (badCc) {
      return new Response(JSON.stringify({ error: `Adresse en copie invalide : ${badCc}` }), { status: 400, headers });
    }
    if (!subject || !message) {
      return new Response(JSON.stringify({ error: "L'objet et le message sont obligatoires" }), { status: 400, headers });
    }

    // RLS-bound read: refuses periods outside the caller's organisation.
    const { data: period, error: periodError } = await supabase
      .from('obligation_periods')
      .select('id, client_id')
      .eq('id', obligationPeriodId)
      .maybeSingle();

    if (periodError || !period) {
      console.error('[relance] period not accessible', periodError?.message);
      return new Response(JSON.stringify({ error: 'Échéance introuvable ou non autorisée' }), { status: 403, headers });
    }

    // Portal CTA only when the client has an active portal account.
    let hasPortal = false;
    try {
      const { data: portal } = await supabase
        .from('portal_users')
        .select('id')
        .eq('client_id', period.client_id)
        .eq('is_active', true)
        .limit(1);
      hasPortal = !!portal?.length;
    } catch (_) { /* ignore — no CTA */ }

    const htmlBody = escapeHtml(message).replace(/\n/g, '<br />');

    const html = buildEmailHtml({
      preheader: subject,
      greeting: 'Bonjour,',
      title: subject,
      body: `<div>${htmlBody}</div>`,
      ctaLabel: hasPortal ? 'Déposer mes documents' : undefined,
      ctaUrl: hasPortal ? `${APP_URL}/espace-client/documents` : undefined,
      footerNote: 'Cet email vous est adressé par votre cabinet comptable dans le cadre du suivi de vos obligations.',
    });

    const result = await sendResend({
      to: toEmail,
      cc: ccEmails,
      subject,
      html,
      reply_to: user.email ?? undefined,
    });

    if (!result.ok) {
      console.error('[relance] send failed:', result.error);
      return new Response(
        JSON.stringify({ error: "L'email n'a pas pu être envoyé.", status: result.status, details: result.error }),
        { status: 502, headers },
      );
    }

    const { error: insertError } = await supabase.from('client_interactions').insert({
      client_id: period.client_id,
      obligation_period_id: period.id,
      type: 'relance',
      title: subject,
      description: message,
      interaction_date: new Date().toISOString(),
      created_by: user.id,
      metadata: { canal, to_email: toEmail, cc_emails: ccEmails, sent: true, resend_id: result.id },
    });

    if (insertError) {
      console.error('[relance] interaction insert failed:', insertError.message);
    }

    return new Response(JSON.stringify({ success: true, resend_id: result.id }), { headers });
  } catch (err) {
    console.error('send-client-reminder error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers });
  }
});
