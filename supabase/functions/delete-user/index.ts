import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization")!;
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("grade_level, organization_id")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || callerProfile.grade_level > 2) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userId === caller.id) {
      return new Response(JSON.stringify({ error: "Vous ne pouvez pas supprimer votre propre compte" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("organization_id")
      .eq("id", userId)
      .single();

    if (!targetProfile || targetProfile.organization_id !== callerProfile.organization_id) {
      return new Response(JSON.stringify({ error: "Utilisateur introuvable" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete all related records before deleting the profile
    // Order matters: delete child references first
    const relatedTables = [
      { table: "task_assignments", column: "user_id" },
      { table: "task_assignments", column: "assigned_by" },
      { table: "task_submissions", column: "submitted_by" },
      { table: "task_submissions", column: "reviewed_by" },
      { table: "mission_members", column: "user_id" },
      { table: "project_members", column: "user_id" },
      { table: "committee_members", column: "user_id" },
      { table: "conversation_members", column: "user_id" },
      { table: "meeting_participants", column: "user_id" },
      { table: "document_shares", column: "shared_with" },
      { table: "document_shares", column: "shared_by" },
      { table: "document_access_log", column: "user_id" },
      { table: "mailing_group_recipients", column: "user_id" },
      { table: "timesheets", column: "user_id" },
      { table: "notifications", column: "user_id" },
      { table: "notes", column: "user_id" },
      { table: "performance_reviews", column: "user_id" },
      { table: "performance_reviews", column: "reviewer_id" },
      { table: "user_roles", column: "user_id" },
    ];

    for (const { table, column } of relatedTables) {
      const { error } = await adminClient.from(table).delete().eq(column, userId);
      if (error) {
        console.error(`Error deleting from ${table}.${column}:`, error.message);
      }
    }

    // Now delete the profile
    const { error: profileError } = await adminClient.from("profiles").delete().eq("id", userId);
    if (profileError) {
      console.error("Error deleting profile:", profileError.message);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Finally delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
