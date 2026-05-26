const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-webhook-secret',
};

const BRAND = {
  name: 'Mission-DGC',
  primary: '#1a4a8c',
  accent: '#d97736',
  dark: '#121a25',
  light: '#f5f6f8',
  white: '#ffffff',
  gray: '#6b7280',
  lightGray: '#e5e7eb',
  logoUrl: 'https://missionpro.lovable.app/logo.png',
};

const baseTemplate = (title: string, content: string, actionUrl?: string, actionText?: string) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.light};font-family:'Inter','Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.light};padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.white};border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND.primary}, #2563eb);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:${BRAND.white};font-size:22px;font-weight:700;font-family:'Plus Jakarta Sans',Arial,sans-serif;">${BRAND.name}</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Plateforme de gestion de missions</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
              ${actionUrl && actionText ? `
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
                <tr>
                  <td align="center">
                    <a href="${actionUrl}" style="display:inline-block;background:linear-gradient(135deg,${BRAND.primary},#2563eb);color:${BRAND.white};text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">${actionText}</a>
                  </td>
                </tr>
              </table>
              ` : ''}
              <p style="margin:24px 0 0;color:${BRAND.gray};font-size:12px;line-height:1.6;">
                Si vous n'avez pas initié cette action, vous pouvez ignorer cet email en toute sécurité.<br>
                Pour toute assistance, contactez l'administrateur de votre organisation.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:${BRAND.lightGray};padding:20px 32px;text-align:center;">
              <p style="margin:0;color:${BRAND.gray};font-size:11px;">
                © ${new Date().getFullYear()} ${BRAND.name} — D&G CONSEIL<br>
                <span style="color:${BRAND.accent};font-weight:600;">Cet email est confidentiel.</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const getSignupTemplate = (confirmationUrl: string, email: string) => {
  const content = `
    <h2 style="margin:0 0 16px;color:${BRAND.dark};font-size:18px;font-weight:700;">Confirmez votre inscription</h2>
    <p style="margin:0 0 16px;color:${BRAND.dark};font-size:14px;line-height:1.6;">Bonjour,</p>
    <p style="margin:0 0 16px;color:${BRAND.dark};font-size:14px;line-height:1.6;">
      Merci de vous être inscrit(e) sur <strong>${BRAND.name}</strong>. Pour finaliser la création de votre compte, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.
    </p>
    <p style="margin:0;color:${BRAND.gray};font-size:13px;">Adresse : <strong>${email}</strong></p>
  `;
  return baseTemplate('Confirmez votre inscription', content, confirmationUrl, 'Confirmer mon email');
};

const getRecoveryTemplate = (confirmationUrl: string, email: string) => {
  const content = `
    <h2 style="margin:0 0 16px;color:${BRAND.dark};font-size:18px;font-weight:700;">Réinitialisation de mot de passe</h2>
    <p style="margin:0 0 16px;color:${BRAND.dark};font-size:14px;line-height:1.6;">Bonjour,</p>
    <p style="margin:0 0 16px;color:${BRAND.dark};font-size:14px;line-height:1.6;">
      Une demande de réinitialisation de mot de passe a été initiée pour votre compte <strong>${email}</strong> sur <strong>${BRAND.name}</strong>.
    </p>
    <p style="margin:0 0 16px;color:${BRAND.dark};font-size:14px;line-height:1.6;">
      Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe. Ce lien est valable 1 heure.
    </p>
    <p style="margin:0;color:${BRAND.gray};font-size:12px;">Si vous n'avez pas fait cette demande, ignorez cet email.</p>
  `;
  return baseTemplate('Réinitialisation de mot de passe', content, confirmationUrl, 'Réinitialiser mon mot de passe');
};

const getInviteTemplate = (confirmationUrl: string, email: string) => {
  const content = `
    <h2 style="margin:0 0 16px;color:${BRAND.dark};font-size:18px;font-weight:700;">Vous êtes invité(e)</h2>
    <p style="margin:0 0 16px;color:${BRAND.dark};font-size:14px;line-height:1.6;">Bonjour,</p>
    <p style="margin:0 0 16px;color:${BRAND.dark};font-size:14px;line-height:1.6;">
      Vous avez été invité(e) à rejoindre <strong>${BRAND.name}</strong>. Cliquez sur le bouton ci-dessous pour accepter l'invitation et créer votre compte.
    </p>
    <p style="margin:0;color:${BRAND.gray};font-size:13px;">Adresse : <strong>${email}</strong></p>
  `;
  return baseTemplate('Invitation à rejoindre', content, confirmationUrl, 'Accepter l\'invitation');
};

const getEmailChangeTemplate = (confirmationUrl: string, email: string, newEmail: string) => {
  const content = `
    <h2 style="margin:0 0 16px;color:${BRAND.dark};font-size:18px;font-weight:700;">Confirmation du changement d'email</h2>
    <p style="margin:0 0 16px;color:${BRAND.dark};font-size:14px;line-height:1.6;">Bonjour,</p>
    <p style="margin:0 0 16px;color:${BRAND.dark};font-size:14px;line-height:1.6;">
      Une demande de changement d'adresse email a été initiée sur <strong>${BRAND.name}</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;background:#f8fafc;border-radius:8px;padding:16px;width:100%;">
      <tr><td style="color:${BRAND.gray};font-size:12px;padding-bottom:4px;">Ancienne adresse</td></tr>
      <tr><td style="color:${BRAND.dark};font-size:14px;font-weight:600;">${email}</td></tr>
      <tr><td style="height:8px;"></td></tr>
      <tr><td style="color:${BRAND.gray};font-size:12px;padding-bottom:4px;">Nouvelle adresse</td></tr>
      <tr><td style="color:${BRAND.dark};font-size:14px;font-weight:600;">${newEmail}</td></tr>
    </table>
    <p style="margin:0;color:${BRAND.dark};font-size:14px;line-height:1.6;">Cliquez sur le bouton ci-dessous pour confirmer ce changement.</p>
  `;
  return baseTemplate('Changement d\'email', content, confirmationUrl, 'Confirmer le changement');
};

const getMagicLinkTemplate = (confirmationUrl: string, email: string) => {
  const content = `
    <h2 style="margin:0 0 16px;color:${BRAND.dark};font-size:18px;font-weight:700;">Lien de connexion</h2>
    <p style="margin:0 0 16px;color:${BRAND.dark};font-size:14px;line-height:1.6;">Bonjour,</p>
    <p style="margin:0 0 16px;color:${BRAND.dark};font-size:14px;line-height:1.6;">
      Vous avez demandé un lien de connexion pour <strong>${BRAND.name}</strong>. Cliquez sur le bouton ci-dessous pour vous connecter sans mot de passe.
    </p>
    <p style="margin:0;color:${BRAND.gray};font-size:12px;">Ce lien expire dans 1 heure.</p>
  `;
  return baseTemplate('Lien de connexion', content, confirmationUrl, 'Me connecter');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get('SEND_EMAIL_HOOK_SECRET');
    const authHeader = req.headers.get('Authorization');
    const webhookSecret = req.headers.get('x-webhook-secret');

    // Verify the secret if configured
    if (secret) {
      const bearerToken = authHeader?.replace('Bearer ', '').trim();
      if (bearerToken !== secret && webhookSecret !== secret) {
        console.warn('auth-email-hook: Unauthorized request');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const payload = await req.json();
    console.log('auth-email-hook received type:', payload.type, 'for:', payload.email);

    const {
      type,
      email,
      confirmation_url,
      new_email,
    } = payload;

    if (!type || !email) {
      return new Response(JSON.stringify({ error: 'Missing type or email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    let subject = '';
    let html = '';

    switch (type) {
      case 'signup':
      case 'confirmation':
        subject = `Confirmez votre inscription sur ${BRAND.name}`;
        html = getSignupTemplate(confirmation_url, email);
        break;
      case 'recovery':
      case 'reset_password':
        subject = `Réinitialisation de votre mot de passe — ${BRAND.name}`;
        html = getRecoveryTemplate(confirmation_url, email);
        break;
      case 'invite':
      case 'invite_user':
        subject = `Invitation à rejoindre ${BRAND.name}`;
        html = getInviteTemplate(confirmation_url, email);
        break;
      case 'email_change':
      case 'change_email':
        subject = `Confirmation du changement d'email — ${BRAND.name}`;
        html = getEmailChangeTemplate(confirmation_url, email, new_email || email);
        break;
      case 'magiclink':
      case 'magic_link':
        subject = `Votre lien de connexion — ${BRAND.name}`;
        html = getMagicLinkTemplate(confirmation_url, email);
        break;
      default:
        console.warn('auth-email-hook: Unknown type', type);
        return new Response(JSON.stringify({ error: 'Unknown email type', type }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    if (!resendApiKey) {
      console.log(`[SIMULATED] Auth email ${type} to ${email}`);
      return new Response(JSON.stringify({ success: true, simulated: true, type, email }), {
        headers: { ...corsHeaders, 'Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${BRAND.name} <noreply@mamission.abodje.com>`,
        to: [email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Resend error:', errText);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: errText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    console.log('Auth email sent via Resend:', data.id, 'to:', email, 'type:', type);

    return new Response(JSON.stringify({ success: true, resend_id: data.id, type, email }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('auth-email-hook error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Type': 'application/json' },
    });
  }
});
