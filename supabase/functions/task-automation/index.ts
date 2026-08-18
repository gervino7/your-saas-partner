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

    const now = new Date();

    // 1. Tasks approaching deadline (2 days)
    const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const { data: deadlineTasks } = await supabase
      .from("tasks")
      .select("id, title, due_date, project_id")
      .in("status", ["todo", "in_progress"])
      .lte("due_date", twoDaysLater.toISOString().split("T")[0])
      .gte("due_date", now.toISOString().split("T")[0]);

    if (deadlineTasks?.length) {
      for (const task of deadlineTasks) {
        const { data: assignees } = await supabase
          .from("task_assignments")
          .select("user_id")
          .eq("task_id", task.id);

        if (assignees) {
          const notifications = assignees.map((a: any) => ({
            user_id: a.user_id,
            type: "task_deadline_soon",
            title: "Deadline proche",
            content: `La tâche "${task.title}" arrive à échéance le ${task.due_date}`,
            entity_type: "task",
            entity_id: task.project_id,
            priority: "high",
          }));
          if (notifications.length) {
            await supabase.from("notifications").insert(notifications);
          }
        }
      }
    }

    // 2. Overdue tasks
    const { data: overdueTasks } = await supabase
      .from("tasks")
      .select("id, title, due_date, project_id")
      .in("status", ["todo", "in_progress"])
      .lt("due_date", now.toISOString().split("T")[0]);

    if (overdueTasks?.length) {
      for (const task of overdueTasks) {
        const { data: assignees } = await supabase
          .from("task_assignments")
          .select("user_id")
          .eq("task_id", task.id);

        if (assignees) {
          const notifications = assignees.map((a: any) => ({
            user_id: a.user_id,
            type: "task_overdue",
            title: "Tâche en retard",
            content: `La tâche "${task.title}" a dépassé sa deadline (${task.due_date})`,
            entity_type: "task",
            entity_id: task.project_id,
            priority: "urgent",
          }));
          if (notifications.length) {
            await supabase.from("notifications").insert(notifications);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, deadline: deadlineTasks?.length || 0, overdue: overdueTasks?.length || 0 }),
      { headers: jsonHeaders }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
