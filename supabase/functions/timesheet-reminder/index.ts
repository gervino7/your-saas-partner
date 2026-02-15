import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split("T")[0];
    const dayOfWeek = new Date().getDay();

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return new Response(JSON.stringify({ message: "Weekend, skipped" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all active profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("is_online", true);

    if (!profiles?.length) {
      return new Response(JSON.stringify({ message: "No active users" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get timesheets for today
    const { data: timesheets } = await supabase
      .from("timesheets")
      .select("user_id")
      .eq("date", today);

    const usersWithTimesheet = new Set(timesheets?.map((t: any) => t.user_id) || []);

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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
