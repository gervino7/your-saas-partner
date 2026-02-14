import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();

    // 1. Meetings in 1 day (email reminder)
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneDayWindowEnd = new Date(oneDayFromNow.getTime() + 5 * 60 * 1000);

    const { data: meetingsIn1Day } = await supabase
      .from("meetings")
      .select("id, title, scheduled_at, organizer_id, meeting_link, meeting_participants(user_id)")
      .eq("status", "scheduled")
      .gte("scheduled_at", oneDayFromNow.toISOString())
      .lt("scheduled_at", oneDayWindowEnd.toISOString());

    // 2. Meetings in 1 hour (in-app notification)
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const oneHourWindowEnd = new Date(oneHourFromNow.getTime() + 5 * 60 * 1000);

    const { data: meetingsIn1Hour } = await supabase
      .from("meetings")
      .select("id, title, scheduled_at, meeting_participants(user_id)")
      .eq("status", "scheduled")
      .gte("scheduled_at", oneHourFromNow.toISOString())
      .lt("scheduled_at", oneHourWindowEnd.toISOString());

    // 3. Meetings in 15 min (in-app notification urgent)
    const fifteenMinFromNow = new Date(now.getTime() + 15 * 60 * 1000);
    const fifteenMinWindowEnd = new Date(fifteenMinFromNow.getTime() + 5 * 60 * 1000);

    const { data: meetingsIn15Min } = await supabase
      .from("meetings")
      .select("id, title, scheduled_at, meeting_link, meeting_participants(user_id)")
      .eq("status", "scheduled")
      .gte("scheduled_at", fifteenMinFromNow.toISOString())
      .lt("scheduled_at", fifteenMinWindowEnd.toISOString());

    const notifications: any[] = [];

    // Create notifications for 1-hour reminders
    for (const meeting of meetingsIn1Hour || []) {
      for (const p of meeting.meeting_participants || []) {
        notifications.push({
          user_id: p.user_id,
          type: "meeting_reminder",
          title: `Rappel : ${meeting.title} dans 1 heure`,
          content: `Votre réunion "${meeting.title}" commence à ${new Date(meeting.scheduled_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
          entity_type: "meeting",
          entity_id: meeting.id,
          priority: "normal",
        });
      }
    }

    // Create notifications for 15-min reminders
    for (const meeting of meetingsIn15Min || []) {
      for (const p of meeting.meeting_participants || []) {
        notifications.push({
          user_id: p.user_id,
          type: "meeting_reminder_urgent",
          title: `⏰ ${meeting.title} commence dans 15 min`,
          content: meeting.meeting_link
            ? `Rejoignez la réunion : ${meeting.meeting_link}`
            : `La réunion commence bientôt.`,
          entity_type: "meeting",
          entity_id: meeting.id,
          priority: "urgent",
        });
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) console.error("Error inserting notifications:", error);
    }

    // Send email reminders for meetings in 1 day
    const resendKey = Deno.env.get("RESEND_API_KEY");
    let emailsSent = 0;

    if (resendKey && meetingsIn1Day && meetingsIn1Day.length > 0) {
      for (const meeting of meetingsIn1Day) {
        for (const p of meeting.meeting_participants || []) {
          // Get user email
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", p.user_id)
            .single();

          if (profile?.email) {
            const meetingDate = new Date(meeting.scheduled_at);
            try {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${resendKey}`,
                },
                body: JSON.stringify({
                  from: "MissionFlow <onboarding@resend.dev>",
                  to: [profile.email],
                  subject: `Rappel : ${meeting.title} — demain`,
                  html: `
                    <h2>Rappel de réunion</h2>
                    <p>Bonjour ${profile.full_name},</p>
                    <p>Vous avez une réunion prévue demain :</p>
                    <ul>
                      <li><strong>${meeting.title}</strong></li>
                      <li>Date : ${meetingDate.toLocaleDateString("fr-FR")}</li>
                      <li>Heure : ${meetingDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</li>
                      ${meeting.meeting_link ? `<li>Lien : <a href="${meeting.meeting_link}">${meeting.meeting_link}</a></li>` : ""}
                    </ul>
                    <p>— MissionFlow</p>
                  `,
                }),
              });
              emailsSent++;
              // Delay between emails
              await new Promise((r) => setTimeout(r, 600));
            } catch (e) {
              console.error("Email send error:", e);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_created: notifications.length,
        emails_sent: emailsSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
