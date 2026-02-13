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
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { emailId } = await req.json();
    if (!emailId) {
      return new Response(JSON.stringify({ error: 'emailId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the email record
    const { data: email, error: emailErr } = await admin
      .from('group_emails')
      .select('*, mailing_groups(*, mailing_group_recipients(*), committees(name, mission_id))')
      .eq('id', emailId)
      .single();

    if (emailErr || !email) {
      return new Response(JSON.stringify({ error: 'Email not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const group = email.mailing_groups;
    const recipients = group?.mailing_group_recipients ?? [];

    // Also get committee members' emails as recipients
    let allRecipients: { name: string; email: string }[] = [];

    if (group?.committee_id) {
      const { data: members } = await admin
        .from('committee_members')
        .select('*, profiles:user_id(full_name, email)')
        .eq('committee_id', group.committee_id);

      if (members) {
        for (const m of members) {
          if (m.is_external && m.external_email) {
            allRecipients.push({ name: m.external_name ?? '', email: m.external_email });
          } else if (m.profiles?.email) {
            allRecipients.push({ name: (m.profiles as any).full_name ?? '', email: (m.profiles as any).email });
          }
        }
      }
    }

    // Add mailing group recipients
    for (const r of recipients) {
      if (r.email && !allRecipients.some((a) => a.email === r.email)) {
        allRecipients.push({ name: r.name ?? '', email: r.email });
      }
    }

    if (allRecipients.length === 0) {
      await admin.from('group_emails').update({ status: 'error', delivery_report: { error: 'No recipients' } }).eq('id', emailId);
      return new Response(JSON.stringify({ error: 'No recipients' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update status to sending
    await admin.from('group_emails').update({ status: 'sending', sent_at: new Date().toISOString() }).eq('id', emailId);

    const deliveryReport: Record<string, any> = {};

    if (!resendApiKey) {
      // No Resend key configured - simulate sending
      for (const r of allRecipients) {
        deliveryReport[r.email] = { status: 'simulated', name: r.name, timestamp: new Date().toISOString() };
      }
      await admin.from('group_emails').update({
        status: 'sent',
        delivery_report: deliveryReport,
      }).eq('id', emailId);

      return new Response(JSON.stringify({
        success: true,
        message: 'Emails simulated (no RESEND_API_KEY configured)',
        recipients: allRecipients.length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Send via Resend API
    for (const recipient of allRecipients) {
      let attempts = 0;
      let sent = false;

      while (attempts < 3 && !sent) {
        attempts++;
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` },
            body: JSON.stringify({
              from: 'MissionFlow <noreply@missionflow.ci>',
              to: [recipient.email],
              subject: email.subject,
              html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                  <h2 style="margin: 0;">MissionFlow</h2>
                </div>
                <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                  ${email.body.replace(/\n/g, '<br>')}
                </div>
                <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 16px;">
                  Envoyé via MissionFlow
                </p>
              </div>`,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            deliveryReport[recipient.email] = { status: 'sent', resend_id: data.id, name: recipient.name, timestamp: new Date().toISOString() };
            sent = true;
          } else {
            const errText = await res.text();
            deliveryReport[recipient.email] = { status: 'error', error: errText, attempts, name: recipient.name };
          }
        } catch (e) {
          deliveryReport[recipient.email] = { status: 'error', error: String(e), attempts, name: recipient.name };
        }
      }
    }

    const allSent = Object.values(deliveryReport).every((r: any) => r.status === 'sent');
    await admin.from('group_emails').update({
      status: allSent ? 'sent' : 'error',
      delivery_report: deliveryReport,
    }).eq('id', emailId);

    return new Response(JSON.stringify({
      success: true,
      recipients: allRecipients.length,
      sent: Object.values(deliveryReport).filter((r: any) => r.status === 'sent').length,
      errors: Object.values(deliveryReport).filter((r: any) => r.status === 'error').length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('send-group-email error:', error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
