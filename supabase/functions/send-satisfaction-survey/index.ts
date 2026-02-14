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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const { missionId, clientId, contactEmail, contactName } = await req.json();

    if (!missionId || !clientId) {
      return new Response(JSON.stringify({ error: 'missionId and clientId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Create survey record with token
    const token = crypto.randomUUID();
    const { data: mission } = await admin.from('missions').select('name, code, organization_id').eq('id', missionId).single();

    const { data: survey, error: surveyErr } = await admin.from('client_surveys').insert({
      client_id: clientId,
      mission_id: missionId,
      token,
      organization_id: mission?.organization_id,
      respondent_email: contactEmail,
      respondent_name: contactName,
    }).select().single();

    if (surveyErr) {
      return new Response(JSON.stringify({ error: surveyErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send email if Resend configured and contactEmail provided
    if (resendApiKey && contactEmail) {
      const surveyUrl = `${req.headers.get('origin') || supabaseUrl.replace('.supabase.co', '.lovable.app')}/survey/${token}`;
      
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` },
        body: JSON.stringify({
          from: 'MissionFlow <onboarding@resend.dev>',
          to: [contactEmail],
          subject: `Enquête de satisfaction — ${mission?.name || 'Mission'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">MissionFlow</h2>
              </div>
              <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
                <p>Bonjour${contactName ? ` ${contactName}` : ''},</p>
                <p>La mission <strong>${mission?.name}</strong> (${mission?.code}) est terminée. Nous aimerions recueillir votre avis.</p>
                <p>Votre retour nous aide à améliorer continuellement la qualité de nos services.</p>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${surveyUrl}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                    Donner mon avis
                  </a>
                </div>
                <p style="color: #6b7280; font-size: 14px;">Ce lien est personnel et à usage unique.</p>
              </div>
              <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 16px;">
                Envoyé via MissionFlow
              </p>
            </div>
          `,
        }),
      });

      const emailResult = await emailRes.text();
      console.log('Survey email result:', emailResult);
    }

    return new Response(JSON.stringify({ success: true, surveyId: survey.id, token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-satisfaction-survey error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
