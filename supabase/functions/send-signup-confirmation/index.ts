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

    const tryGenerateLink = () =>
      admin.auth.admin.generateLink({
        type: 'signup',
        email,
        password,
        options: {
          data: { full_name: full_name || '', invitation_token: invitation_token || '' },
          redirectTo: `${APP_URL}/`,
        },
      });

    let { data: linkData, error: linkError } = await tryGenerateLink();

    // If user already exists, check if confirmed. If not, delete & recreate to send fresh link.
    if (linkError) {
      const code = (linkError as { code?: string }).code || '';
      const msg = linkError.message?.toLowerCase() || '';
      const isExists = code === 'email_exists' || msg.includes('already') || msg.includes('registered') || msg.includes('exists');

      if (isExists) {
        // Find existing user
        let existingUser: { id: string; email: string; email_confirmed_at: string | null; user_metadata?: Record<string, unknown> } | null = null;
        let page = 1;
        while (page <= 20 && !existingUser) {
          const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 200 });
          if (listErr) break;
          const found = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
          if (found) existingUser = {
            id: found.id,
            email: found.email ?? email,
            email_confirmed_at: found.email_confirmed_at ?? null,
            user_metadata: found.user_metadata as Record<string, unknown> | undefined,
          };
          if (!list || list.users.length < 200) break;
          page++;
        }

        if (existingUser?.email_confirmed_at) {
          await ensureProfileExists(admin, existingUser, full_name);
          return new Response(JSON.stringify({ error: 'already_registered' }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (existingUser) {
          // Unconfirmed → delete and retry so a fresh confirmation link is generated
          const { error: delErr } = await admin.auth.admin.deleteUser(existingUser.id);
          if (delErr) {
            console.error('deleteUser error:', delErr);
            return new Response(JSON.stringify({ error: 'cannot_reset_unconfirmed', details: delErr.message }), {
              status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          const retry = await tryGenerateLink();
          linkData = retry.data;
          linkError = retry.error;
        }
      }

      if (linkError) {
        console.error('generateLink error:', linkError);
        return new Response(JSON.stringify({ error: linkError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
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

async function ensureProfileExists(
  admin: ReturnType<typeof createClient>,
  user: { id: string; email: string; user_metadata?: Record<string, unknown> },
  fullName?: string,
) {
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (existingProfile) return;

  const metadataName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';
  const displayName = fullName?.trim() || metadataName.trim() || user.email.split('@')[0];

  const { error: profileError } = await admin.from('profiles').insert({
    id: user.id,
    email: user.email,
    full_name: displayName,
    grade: 'AUD',
  });
  if (profileError) console.error('ensureProfileExists profile error:', profileError.message);

  const { error: roleError } = await admin.from('user_roles').upsert({
    user_id: user.id,
    role: 'member',
  }, { onConflict: 'user_id,role' });
  if (roleError) console.error('ensureProfileExists role error:', roleError.message);
}
