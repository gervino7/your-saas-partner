import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import { buildEmailHtml, sendResend } from '../_shared/email-template.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

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

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Authentification requise' }), { status: 401, headers });
    }

    const { data: isAdmin, error: adminErr } = await supabase.rpc('is_platform_admin');
    if (adminErr) {
      console.error('[test-email] is_platform_admin error:', adminErr.message);
      return new Response(JSON.stringify({ error: adminErr.message }), { status: 500, headers });
    }
    if (isAdmin !== true) {
      return new Response(JSON.stringify({ error: 'Accès réservé aux administrateurs de la plateforme' }), { status: 403, headers });
    }

    const body = await req.json().catch(() => ({}));
    const to = typeof body?.to === 'string' ? body.to.trim() : '';
    if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      return new Response(JSON.stringify({ error: 'Adresse email "to" invalide' }), { status: 400, headers });
    }

    const html = buildEmailHtml({
      preheader: 'Test de configuration email Mission-DGC',
      title: 'Test de livraison email',
      greeting: 'Bonjour,',
      body: `<p style="margin:0 0 12px 0;">Cet email de test confirme que l'infrastructure d'envoi (Resend) est correctement configurée.</p>
             <p style="margin:0;">Envoyé le ${new Date().toISOString()}.</p>`,
      ctaLabel: 'Ouvrir Mission-DGC',
      ctaUrl: Deno.env.get('APP_URL') || 'https://mamission.abodje.com',
      footerNote: 'Email de diagnostic — aucune action requise.',
    });

    const result = await sendResend({ to, subject: 'Test email — Mission-DGC', html });

    return new Response(
      JSON.stringify({
        ok: result.ok,
        resend_status: result.status ?? null,
        resend_id: result.id ?? null,
        error: result.error ?? null,
        to,
      }),
      { status: result.ok ? 200 : 502, headers },
    );
  } catch (err) {
    console.error('test-email error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers });
  }
});
