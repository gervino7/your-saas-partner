import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendResend } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateOTP(): string {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

function generateSessionToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const { action } = body;

    // ── ACTION: send-otp ──
    if (action === "send-otp") {
      const { committee_id, email } = body;
      if (!committee_id || !email) {
        return new Response(JSON.stringify({ error: "committee_id and email required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify this email is a member of the committee (external)
      // Use ilike for case-insensitive comparison
      const { data: members } = await admin
        .from("committee_members")
        .select("id, external_name, committee_id")
        .eq("committee_id", committee_id)
        .eq("is_external", true)
        .ilike("external_email", email.trim());

      const member = members && members.length > 0 ? members[0] : null;

      if (!member) {
        return new Response(JSON.stringify({ error: "Email non autorisé pour ce comité" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check mission is not archived/completed for too long
      const { data: committee } = await admin
        .from("committees")
        .select("id, name, mission_id, missions:missions!committees_mission_id_fkey(name, status)")
        .eq("id", committee_id)
        .single();

      if (!committee) {
        return new Response(JSON.stringify({ error: "Comité introuvable" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const mission = (committee as any).missions;
      if (mission?.status === "archived") {
        return new Response(JSON.stringify({ error: "Cette mission est archivée" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate OTP
      const otp = generateOTP();
      const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

      // Store OTP
      await admin.from("copil_access_tokens").insert({
        committee_id,
        email: email.toLowerCase().trim(),
        otp_code: otp,
        otp_expires_at: otpExpiresAt,
      });

      // Send OTP via email
      {
        const memberName = member.external_name || email;
        const committeeName = (committee as any).name || "COPIL";
        const missionName = mission?.name || "Mission";

        const result = await sendResend({
          to: email,
          subject: `Code d'accès portail ${committeeName} — ${missionName}`,
          html: `
              <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #1a1a1a; margin-bottom: 8px;">Portail Documents ${committeeName}</h2>
                <p style="color: #555;">Bonjour ${memberName},</p>
                <p style="color: #555;">Voici votre code d'accès au portail documents du ${committeeName} pour la mission <strong>${missionName}</strong> :</p>
                <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${otp}</span>
                </div>
                <p style="color: #888; font-size: 13px;">Ce code est valide pendant <strong>15 minutes</strong>.</p>
                <p style="color: #888; font-size: 13px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                <p style="color: #aaa; font-size: 12px;">MissionFlow — Plateforme de gestion de missions</p>
              </div>
            `,
        });

        if (!result.ok) {
          return new Response(JSON.stringify({ error: "Le code n'a pas pu être envoyé par email.", details: result.error }), {
            status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ success: true, message: "Code envoyé" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: verify-otp ──
    if (action === "verify-otp") {
      const { committee_id, email, otp } = body;
      if (!committee_id || !email || !otp) {
        return new Response(JSON.stringify({ error: "Missing fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: token } = await admin
        .from("copil_access_tokens")
        .select("*")
        .eq("committee_id", committee_id)
        .eq("email", email.toLowerCase().trim())
        .eq("otp_code", otp)
        .eq("verified", false)
        .gte("otp_expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!token) {
        return new Response(JSON.stringify({ error: "Code invalide ou expiré" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate session token (valid 24h)
      const sessionToken = generateSessionToken();
      const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await admin
        .from("copil_access_tokens")
        .update({
          verified: true,
          session_token: sessionToken,
          session_expires_at: sessionExpiresAt,
        })
        .eq("id", token.id);

      return new Response(JSON.stringify({ success: true, session_token: sessionToken }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: get-documents ──
    if (action === "get-documents") {
      const { committee_id, session_token } = body;
      if (!committee_id || !session_token) {
        return new Response(JSON.stringify({ error: "Missing fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate session
      const { data: session } = await admin
        .from("copil_access_tokens")
        .select("*")
        .eq("committee_id", committee_id)
        .eq("session_token", session_token)
        .eq("verified", true)
        .gte("session_expires_at", new Date().toISOString())
        .single();

      if (!session) {
        return new Response(JSON.stringify({ error: "Session invalide ou expirée" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get committee info
      const { data: committee } = await admin
        .from("committees")
        .select("id, name, type, mission_id, missions:missions!committees_mission_id_fkey(name, code, status, progress)")
        .eq("id", committee_id)
        .single();

      // Get COPIL-tagged documents
      const { data: copilDocs } = await admin
        .from("documents")
        .select("id, name, file_path, mime_type, file_size, created_at, status, version")
        .eq("committee_id", committee_id)
        .in("status", ["published", "approved"])
        .order("created_at", { ascending: false });

      // Get documents from committee meetings (minutes)
      const { data: meetings } = await admin
        .from("committee_meetings")
        .select("id, title, scheduled_at, status, minutes_document_id, decisions")
        .eq("committee_id", committee_id)
        .order("scheduled_at", { ascending: false });

      // Fetch meeting minute documents
      const minuteDocIds = (meetings || [])
        .filter((m: any) => m.minutes_document_id)
        .map((m: any) => m.minutes_document_id);

      let minuteDocs: any[] = [];
      if (minuteDocIds.length > 0) {
        const { data } = await admin
          .from("documents")
          .select("id, name, file_path, mime_type, file_size, created_at, status, version")
          .in("id", minuteDocIds);
        minuteDocs = data || [];
      }

      // Generate signed URLs for all documents
      const allDocs = [...(copilDocs || []), ...minuteDocs];
      const uniqueDocs = allDocs.filter(
        (doc, idx, arr) => arr.findIndex((d) => d.id === doc.id) === idx
      );

      const docsWithUrls = await Promise.all(
        uniqueDocs.map(async (doc: any) => {
          const { data: signedData } = await admin.storage
            .from("documents")
            .createSignedUrl(doc.file_path, 3600); // 1h
          return { ...doc, signed_url: signedData?.signedUrl || null };
        })
      );

      return new Response(
        JSON.stringify({
          committee,
          documents: docsWithUrls,
          meetings: meetings || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("copil-portal-auth error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
