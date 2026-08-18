import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Machine-to-machine function: no browser CORS.
const jsonHeaders = { "Content-Type": "application/json" };

Deno.serve(async (req) => {
  const CRON_SECRET = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");

  if (!CRON_SECRET) {
    console.error("[cron] CRON_SECRET not configured — refusing to run");
    return new Response(JSON.stringify({ error: "Configuration manquante" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
  if (provided !== CRON_SECRET) {
    console.warn("[cron] rejected call without valid secret");
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split("T")[0];
    const dayOfWeek = new Date().getDay();

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return new Response(JSON.stringify({ message: "Weekend, skipped" }), { headers: jsonHeaders });
    }

    // Get all active profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("is_online", true);

    if (!profiles?.length) {
      return new Response(JSON.stringify({ message: "No active users" }), { headers: jsonHeaders });
    }

    // Get time entries for today
    const { data: entries } = await supabase
      .from("time_entries")
      .select("user_id")
      .eq("date", today);

    const usersWithTimesheet = new Set(entries?.map((t: any) => t.user_id) || []);

    // Create notifications for users without timesheet
    const notifications = profiles
      .filter((p: any) => !usersWithTimesheet.has(p.id))
      .map((p: any) => ({
        user_id: p.id,
        type: "timesheet_reminder",
        title: "Rappel timesheet",
        content: `Vous n'avez pas encore saisi votre feuille de temps pour aujourd'hui.`,
        priority: "high",
      }));

    if (notifications.length) {
      await supabase.from("notifications").insert(notifications);
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: notifications.length }),
      { headers: jsonHeaders }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
