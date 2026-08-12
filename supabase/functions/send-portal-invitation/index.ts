import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import { buildEmailHtml, EMAIL_FROM } from '../_shared/email-template.ts';

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

    const { client_id, email, full_name } = await req.json();
    if (!client_id || !email) {
      return new Response(JSON.stringify({ error: 'client_id et email sont requis' }), { status: 400, headers });
    }

    console.log('[invite] creating invitation for', email, 'client', client_id);

    const { data, error } = await supabase.rpc('create_portal_invitation', {
      _client_id: client_id,
      _email: String(email).trim().toLowerCase(),
      _full_name: full_name ?? null,
    });

    if (error) {
      console.error('create_portal_invitation error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers });
    }

    const invitation = data as {
      token: string; email: string; client_name: string; expires_at: string;
    };

    const activationUrl = `${APP_URL}/espace-client/activation?token=${encodeURIComponent(invitation.token)}`;
    const displayName = (full_name || '').trim() || invitation.email.split('@')[0];

    const html = buildEmailHtml({
      preheader: `Activez votre espace client — ${invitation.client_name}`,
      title: 'Votre espace client est prêt',
      greeting: `Bonjour <strong>${escapeHtml(displayName)}</strong>,`,
      body: `
        <p style="margin:0 0 12px 0;">Votre cabinet a ouvert un <strong>espace client sécurisé</strong> pour <strong>${escapeHtml(invitation.client_name)}</strong>.</p>
        <p style="margin:0 0 12px 0;">Vous pourrez y consulter vos dossiers, échanger vos documents et suivre vos échéances en toute confidentialité.</p>
        <p style="margin:0;">Cliquez sur le bouton ci-dessous pour créer votre mot de passe et activer votre accès :</p>
      `,
      ctaLabel: 'Activer mon accès',
      ctaUrl: activationUrl,
      footerNote: "Ce lien expire dans 7 jours. Si vous n'attendiez pas cet email, vous pouvez l'ignorer.",
    });

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('[invite] RESEND_API_KEY manquante — email non envoyé');
      return new Response(
        JSON.stringify({ error: "Le service d'envoi d'emails n'est pas configuré (RESEND_API_KEY manquante)." }),
        { status: 500, headers },
      );
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [invitation.email],
        subject: `Accès à votre espace client — ${invitation.client_name}`,
        html,
      }),
    });

    const resendBody = await res.text();
    console.log('[invite] resend status', res.status, resendBody);

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: "L'invitation a été créée mais l'email n'a pas pu être envoyé.",
          status: res.status,
          details: resendBody,
        }),
        { status: 502, headers },
      );
    }

    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (err) {
    console.error('send-portal-invitation error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers });
  }
});
