// Shared email template builder — Navy & Cuivre design

export const EMAIL_LOGO_URL =
  'https://zewszfgmysyocroavlja.supabase.co/storage/v1/object/public/org-assets/branding/logo-email.png';


export interface EmailTemplateOptions {
  preheader?: string;
  greeting: string;
  title: string;
  body: string; // raw HTML
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}

export function buildEmailHtml(opts: EmailTemplateOptions): string {
  const {
    preheader = '',
    greeting,
    title,
    body,
    ctaLabel,
    ctaUrl,
    footerNote = "Si vous n'avez pas effectué cette demande, ignorez simplement cet email.",
  } = opts;

  const ctaBlock = ctaLabel && ctaUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:32px auto 8px auto;">
                <tr>
                  <td align="center" style="background:#d4782f;border-radius:10px;">
                    <a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">${ctaLabel}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br />
                <a href="${ctaUrl}" style="color:#1a5091;word-break:break-all;">${ctaUrl}</a>
              </p>`
    : '';


  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Mission-DGC</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1f2937;">
  <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f5f6fa;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(15,32,60,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1a5091;padding:28px 32px;text-align:left;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="${EMAIL_LOGO_URL}" alt="Mission-DGC" width="36" height="36" style="display:block;border:0;border-radius:8px;" />
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <div style="color:#ffffff;font-size:18px;font-weight:700;line-height:1;">Mission-DGC</div>
                    <div style="color:rgba(255,255,255,0.65);font-size:11px;margin-top:3px;letter-spacing:0.5px;">by D&amp;G CONSEIL</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 24px 32px;">
              <h1 style="margin:0 0 8px 0;color:#1a5091;font-size:22px;font-weight:700;line-height:1.3;">${title}</h1>
              <p style="margin:0 0 20px 0;color:#374151;font-size:15px;line-height:1.6;">${greeting}</p>
              <div style="color:#4b5563;font-size:14px;line-height:1.65;">${body}</div>
              <!-- CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:32px auto 8px auto;">
                <tr>
                  <td align="center" style="background:#d4782f;border-radius:10px;">
                    <a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">${ctaLabel}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br />
                <a href="${ctaUrl}" style="color:#1a5091;word-break:break-all;">${ctaUrl}</a>
              </p>
              <p style="margin:20px 0 0 0;color:#9ca3af;font-size:12px;line-height:1.6;font-style:italic;">${footerNote}</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px 32px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
                © ${new Date().getFullYear()} D&amp;G CONSEIL · <a href="https://mamission.abodje.com" style="color:#1a5091;text-decoration:none;">mamission.abodje.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const EMAIL_FROM = 'Mission-DGC <noreply@mamission.abodje.com>';

export async function sendResend(params: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<Record<string, unknown>>;
  from?: string;
}): Promise<{ ok: boolean; id?: string; status?: number; error?: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.error('[email] RESEND_API_KEY is not configured — email NOT sent to', params.to);
    return { ok: false, error: 'RESEND_API_KEY non configurée' };
  }

  const payload: Record<string, unknown> = {
    from: params.from || EMAIL_FROM,
    to: [params.to],
    subject: params.subject,
    html: params.html,
  };
  if (params.attachments?.length) payload.attachments = params.attachments;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });

  console.log('[email] resend status', res.status, 'to', params.to);

  const text = await res.text();
  if (!res.ok) {
    console.error('[email] resend error body:', text);
    return { ok: false, status: res.status, error: text };
  }

  let id: string | undefined;
  try { id = JSON.parse(text)?.id; } catch { /* ignore */ }
  return { ok: true, id, status: res.status };
}

