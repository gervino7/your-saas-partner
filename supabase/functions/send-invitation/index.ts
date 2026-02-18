import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    // Verify caller
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { email, token, grade, organizationName } = await req.json();
    if (!email || !token) {
      return new Response(JSON.stringify({ error: 'email and token required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const appUrl = req.headers.get('origin') || 'https://missionpro.lovable.app';
    const inviteLink = `${appUrl}/register?token=${token}`;

    const gradeLabels: Record<string, string> = {
      DA: 'Directeur Associé', DM: 'Directeur de Mission', CM: 'Chef de Mission',
      SUP: 'Superviseur', SEN: 'Auditeur Senior', AUD: 'Auditeur',
      JUN: 'Auditeur Junior', STG: 'Stagiaire',
    };
    const gradeLabel = gradeLabels[grade] || grade || 'Membre';
    const orgName = organizationName || 'MissionFlow';

    if (!resendApiKey) {
      console.log(`[SIMULATED] Invitation email to ${email} with link ${inviteLink}`);
      return new Response(JSON.stringify({
        success: true,
        message: 'Email simulated (no RESEND_API_KEY configured)',
        inviteLink,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="margin: 0;">MissionFlow</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
          <h3 style="margin-top: 0;">Vous êtes invité(e) à rejoindre ${orgName}</h3>
          <p>Bonjour,</p>
          <p>Vous avez été invité(e) à rejoindre l'équipe <strong>${orgName}</strong> sur MissionFlow en tant que <strong>${gradeLabel}</strong>.</p>
          <p>Cliquez sur le bouton ci-dessous pour créer votre compte :</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteLink}" style="background: #6366f1; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
              Accepter l'invitation
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Ce lien expire dans 7 jours. Si vous n'avez pas demandé cette invitation, ignorez cet email.</p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">
          Envoyé via MissionFlow
        </p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` },
      body: JSON.stringify({
        from: 'MissionFlow <onboarding@resend.dev>',
        to: [email],
        subject: `Invitation à rejoindre ${orgName} sur MissionFlow`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Resend error:', errText);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: errText }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await res.json();
    console.log('Invitation email sent:', data.id);

    return new Response(JSON.stringify({
      success: true,
      resend_id: data.id,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('send-invitation error:', error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
