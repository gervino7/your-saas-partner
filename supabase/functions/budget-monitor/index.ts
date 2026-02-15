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

    // Get active missions with budget
    const { data: missions } = await supabase
      .from("missions")
      .select("id, name, budget_amount, budget_currency, director_id, chief_id, organization_id")
      .eq("status", "active")
      .gt("budget_amount", 0);

    if (!missions?.length) {
      return new Response(JSON.stringify({ message: "No active missions with budget" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let alertCount = 0;

    for (const mission of missions) {
      // Calculate actual cost from timesheets
      const { data: timesheets } = await supabase
        .from("timesheets")
        .select("hours, user_id")
        .eq("mission_id", mission.id);

      if (!timesheets?.length) continue;

      // Get daily rates
      const { data: rates } = await supabase
        .from("daily_rates")
        .select("grade, daily_rate")
        .eq("organization_id", mission.organization_id);

      const rateMap = new Map(rates?.map((r: any) => [r.grade, r.daily_rate]) || []);

      // Get user grades
      const userIds = [...new Set(timesheets.map((t: any) => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, grade")
        .in("id", userIds);

      const userGrade = new Map(profiles?.map((p: any) => [p.id, p.grade]) || []);

      let totalCost = 0;
      for (const ts of timesheets) {
        const grade = userGrade.get(ts.user_id);
        const dailyRate = rateMap.get(grade) || 0;
        totalCost += (ts.hours / 8) * Number(dailyRate);
      }

      const usage = (totalCost / Number(mission.budget_amount)) * 100;

      if (usage >= 80) {
        alertCount++;
        const recipients = [mission.director_id, mission.chief_id].filter(Boolean);
        const notifications = recipients.map((userId: string) => ({
          user_id: userId,
          type: "budget_alert",
          title: "Alerte budget mission",
          content: `La mission "${mission.name}" a consommé ${Math.round(usage)}% de son budget.`,
          entity_type: "mission",
          entity_id: mission.id,
          priority: "urgent",
        }));
        if (notifications.length) {
          await supabase.from("notifications").insert(notifications);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, missions_checked: missions.length, alerts: alertCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
