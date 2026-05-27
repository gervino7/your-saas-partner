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
    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'email required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${APP_URL}/reset-password` },
    });

    // Always respond success to prevent email enumeration
    if (linkError || !linkData?.properties?.action_link) {
      console.warn('generateLink recovery skipped:', linkError?.message);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const actionLink = linkData.properties.action_link;
    const html = buildEmailHtml({
      preheader: 'Réinitialisez le mot de passe de votre compte Mission-DGC.',
      title: 'Réinitialisation de votre mot de passe',
      greeting: 'Bonjour,',
      body: `
        <p style="margin:0 0 12px 0;">Nous avons reçu une demande de réinitialisation du mot de passe associé à votre compte <strong>Mission-DGC</strong>.</p>
        <p style="margin:0;">Pour choisir un nouveau mot de passe, cliquez sur le bouton ci-dessous :</p>
      `,
      ctaLabel: 'Réinitialiser mon mot de passe',
      ctaUrl: actionLink,
      footerNote: "Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email — votre mot de passe restera inchangé.",
    });

    const result = await sendResend({
      to: email,
      subject: 'Réinitialisation de votre mot de passe — Mission-DGC',
      html,
    });

    if (!result.ok) {
      console.error('Resend failed:', result.error);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-password-reset error:', err);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
