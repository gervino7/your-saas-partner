import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import { buildEmailHtml, sendResend } from '../_shared/email-template.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_URL = Deno.env.get('APP_URL') || 'https://mamission.abodje.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { email, password, full_name, invitation_token } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'email and password required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Check if user already exists & is confirmed → block re-signup
    // Otherwise generateLink type=signup will create OR return existing unconfirmed user
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        data: { full_name: full_name || '', invitation_token: invitation_token || '' },
        redirectTo: `${APP_URL}/`,
      },
    });

    if (linkError) {
      console.error('generateLink error:', linkError);
      const msg = linkError.message?.toLowerCase() || '';
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        return new Response(JSON.stringify({ error: 'already_registered' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: linkError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) {
      return new Response(JSON.stringify({ error: 'no_action_link' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const displayName = full_name?.trim() || email.split('@')[0];
    const html = buildEmailHtml({
      preheader: 'Confirmez votre adresse email pour activer votre compte Mission-DGC.',
      title: 'Bienvenue sur Mission-DGC',
      greeting: `Bonjour <strong>${escapeHtml(displayName)}</strong>,`,
      body: `
        <p style="margin:0 0 12px 0;">Merci de rejoindre <strong>Mission-DGC</strong>, la plateforme collaborative des cabinets de conseil et d'audit.</p>
        <p style="margin:0;">Pour activer votre compte et accéder à votre espace de travail, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>
      `,
      ctaLabel: 'Confirmer mon email',
      ctaUrl: actionLink,
      footerNote: "Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.",
    });

    const result = await sendResend({
      to: email,
      subject: 'Confirmez votre email — Mission-DGC',
      html,
    });

    if (!result.ok) {
      return new Response(JSON.stringify({ error: 'send_failed', details: result.error }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, resend_id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-signup-confirmation error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
