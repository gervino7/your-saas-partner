import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PLAN_LABELS: Record<string, string> = {
  free: 'Gratuit',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { email, fullName, organizationName, slug, plan, maxUsers, maxStorageGb } = await req.json();
    if (!email || !slug || !organizationName) {
      return new Response(JSON.stringify({ error: 'email, slug, organizationName required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://mamission.abodje.com';
    const orgUrl = `${appUrl}/org/${slug}`;
    const planLabel = PLAN_LABELS[plan] || plan || 'Gratuit';

    if (!resendApiKey) {
      console.log(`[SIMULATED] Org welcome email to ${email}: ${orgUrl}`);
      return new Response(JSON.stringify({ success: true, simulated: true, orgUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="margin: 0;">Bienvenue sur Mission-DGC 🎉</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; background: white;">
          <p>Bonjour ${fullName || ''},</p>
          <p>Votre organisation <strong>${organizationName}</strong> a été créée avec succès.</p>

          <h3 style="margin-top: 24px;">🔗 Votre URL personnalisée</h3>
          <div style="background:#f3f4f6;padding:12px;border-radius:6px;font-family:monospace;word-break:break-all;">
            <a href="${orgUrl}" style="color:#6366f1;text-decoration:none;">${orgUrl}</a>
          </div>
          <p style="color:#6b7280;font-size:13px;">Partagez ce lien avec votre équipe pour qu'elle accède directement à votre espace.</p>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${orgUrl}" style="background:#6366f1;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">
              Accéder à mon espace
            </a>
          </div>

          <h3>📋 Récapitulatif</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:6px 0;color:#6b7280;">Organisation</td><td style="padding:6px 0;"><strong>${organizationName}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Identifiant URL</td><td style="padding:6px 0;"><code>${slug}</code></td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Abonnement</td><td style="padding:6px 0;">${planLabel}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Utilisateurs max</td><td style="padding:6px 0;">${maxUsers ?? '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Stockage</td><td style="padding:6px 0;">${maxStorageGb ?? '—'} Go</td></tr>
          </table>

          <h3 style="margin-top:24px;">🚀 Guide de démarrage rapide</h3>
          <ol style="padding-left:20px;line-height:1.8;">
            <li>Invitez vos collaborateurs depuis <strong>Administration → Utilisateurs</strong>.</li>
            <li>Créez votre premier client dans <strong>CRM</strong>.</li>
            <li>Lancez votre première mission depuis <strong>Missions → Nouvelle mission</strong>.</li>
            <li>Structurez vos projets, activités et tâches.</li>
            <li>Configurez votre COPIL pour piloter la gouvernance.</li>
          </ol>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">Mission-DGC — Plateforme de gestion de missions</p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Mission-DGC <noreply@abodje.com>',
        to: [email],
        subject: `Bienvenue ! Votre espace ${organizationName} est prêt`,
        html,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('Resend error', txt);
      return new Response(JSON.stringify({ error: 'Email send failed', detail: txt }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, orgUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
