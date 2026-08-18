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

    // Get active missions with budget
    const { data: missions } = await supabase
      .from("missions")
      .select("id, name, budget_amount, budget_currency, director_id, chief_id, organization_id")
      .eq("status", "active")
      .gt("budget_amount", 0);

    if (!missions?.length) {
      return new Response(JSON.stringify({ message: "No active missions with budget" }), {
        headers: jsonHeaders,
      });
    }

    let alertCount = 0;

    for (const mission of missions) {
      // Calculate actual cost from time entries
      const { data: entries } = await supabase
        .from("time_entries")
        .select("hours, user_id")
        .eq("mission_id", mission.id);

      if (!entries?.length) continue;

      // Get daily rates
      const { data: rates } = await supabase
        .from("daily_rates")
        .select("grade, daily_rate")
        .eq("organization_id", mission.organization_id);

      const rateMap = new Map(rates?.map((r: any) => [r.grade, r.daily_rate]) || []);

      // Get user grades
      const userIds = [...new Set(entries.map((t: any) => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, grade")
        .in("id", userIds);

      const userGrade = new Map(profiles?.map((p: any) => [p.id, p.grade]) || []);

      let totalCost = 0;
      for (const ts of entries) {
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
      { headers: jsonHeaders }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
