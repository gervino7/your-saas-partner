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

function fmtDate(d: string | null): string {
  if (!d) return '';
  const [y, m, day] = d.split('T')[0].split('-');
  return `${day}/${m}/${y}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Ctx {
  document_label: string;
  reject_reason: string | null;
  obligation_label: string;
  period_label: string;
  due_date: string | null;
  client_id: string;
  client_name: string;
  portal_emails: string[];
  contact_emails: string[];
}

Deno.serve(async (req) => {
  const headers = { ...cors(req.headers.get('origin')), 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req.headers.get('origin')) });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ ok: false, error: 'Authentification requise' }), { status: 401, headers });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ ok: false, error: 'Authentification requise' }), { status: 401, headers });
    }

    const body = await req.json();
    const documentIds: string[] = Array.isArray(body.document_ids) ? body.document_ids.map(String) : [];
    const reason = String(body.reason ?? '').trim();

    if (documentIds.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Aucune pièce fournie' }), { status: 400, headers });
    }
    if (reason.length < 5) {
      return new Response(JSON.stringify({ ok: false, error: 'Motif de rejet obligatoire' }), { status: 400, headers });
    }

    // Regroupement par client : un seul email par client.
    const byClient = new Map<string, { ctx: Ctx; docs: Ctx[] }>();

    for (const id of documentIds) {
      const { data, error } = await supabase.rpc('get_rejection_context', { _document_id: id });
      if (error || !data) {
        console.error('[rejet] contexte introuvable', id, error?.message);
        continue;
      }
      const ctx = data as unknown as Ctx;
      const entry = byClient.get(ctx.client_id) ?? { ctx, docs: [] };
      entry.docs.push(ctx);
      byClient.set(ctx.client_id, entry);
    }

    if (byClient.size === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Pièces introuvables' }), { status: 404, headers });
    }

    const results: Array<{ client: string; ok: boolean; error?: string }> = [];

    for (const { ctx, docs } of byClient.values()) {
      const recipients = (ctx.portal_emails?.length ? ctx.portal_emails : ctx.contact_emails ?? [])
        .filter((e) => typeof e === 'string' && EMAIL_RE.test(e));

      if (recipients.length === 0) {
        results.push({ client: ctx.client_name, ok: false, error: 'Aucune adresse email connue' });
        continue;
      }

      const hasPortal = (ctx.portal_emails?.length ?? 0) > 0;
      const subject = `Pièces à renvoyer — ${ctx.obligation_label} ${ctx.period_label}`;

      const list = docs.map((d) => `
        <li style="margin-bottom:8px;">
          <strong>${escapeHtml(d.document_label)}</strong><br />
          <span style="color:#5B6470;">Motif : ${escapeHtml(d.reject_reason || reason)}</span>
        </li>`).join('');

      const html = buildEmailHtml({
        preheader: subject,
        greeting: `Bonjour,`,
        title: subject,
        body: `
          <p style="margin:0 0 12px 0;">Les pièces suivantes transmises pour ${escapeHtml(ctx.obligation_label)} ${escapeHtml(ctx.period_label)} n'ont pas pu être acceptées :</p>
          <ul style="margin:0 0 16px 18px;padding:0;">${list}</ul>
          ${ctx.due_date ? `<p style="margin:0 0 12px 0;">Échéance de dépôt : <strong>${fmtDate(ctx.due_date)}</strong>.</p>` : ''}
          <p style="margin:0;">Merci de transmettre les pièces corrigées.</p>`,
        ctaLabel: hasPortal ? 'Déposer les pièces' : undefined,
        ctaUrl: hasPortal ? `${APP_URL}/espace-client/obligations` : undefined,
        footerNote: 'Cet email vous est adressé par votre cabinet comptable dans le cadre du suivi de vos obligations.',
      });

      const sent = await sendResend({
        to: recipients[0],
        cc: recipients.slice(1),
        subject,
        html,
        reply_to: user.email ?? undefined,
      });

      if (!sent.ok) console.error('[rejet] envoi échoué', ctx.client_name, sent.error);
      results.push({ client: ctx.client_name, ok: sent.ok, error: sent.error });
    }

    const allOk = results.every((r) => r.ok);
    return new Response(
      JSON.stringify({ ok: allOk, results }),
      { status: allOk ? 200 : 502, headers },
    );
  } catch (e) {
    console.error('[rejet] erreur inattendue', e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : 'Erreur inattendue' }),
      { status: 500, headers },
    );
  }
});
