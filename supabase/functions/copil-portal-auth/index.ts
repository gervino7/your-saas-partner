// Portail COPIL : les membres externes d'un comité lisent les documents publiés
// après avoir reçu un code par courriel.
//
// Toute la règle est en base (script 54) : copil_demander_code,
// copil_verifier_code et copil_session, réservées à service_role. Cette
// fonction n'envoie que le courriel et sert les documents.
//
// Les réponses ne disent jamais si une adresse fait partie du comité.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendResend } from "../_shared/email-template.ts";
import { corsFor, escapeHtml, jsonResponse } from "../_shared/strict-cors.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const MESSAGE_ENVOI =
  "Si cette adresse est autorisée pour ce comité, un code vient de lui être envoyé.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsFor(req) });
  }
  if (req.method !== "POST") {
    return jsonResponse(req, 405, { error: "Méthode non autorisée" });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const committeeId = typeof body?.committee_id === "string" ? body.committee_id : "";
    if (!UUID.test(committeeId)) {
      return jsonResponse(req, 400, { error: "Lien de portail invalide" });
    }

    // ── Demander un code ────────────────────────────────────────────────
    if (action === "send-otp") {
      const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!EMAIL.test(email) || email.length > 254) {
        return jsonResponse(req, 400, { error: "Adresse e-mail invalide" });
      }

      const { data, error } = await admin.rpc("copil_demander_code", {
        _committee_id: committeeId,
        _email: email,
      });
      if (error) {
        console.error("copil send-otp: rpc", error.code);
        return jsonResponse(req, 500, { error: "Le service est momentanément indisponible." });
      }

      // Adresse inconnue, mission fermée ou trop de demandes : même réponse.
      if (data?.envoyer) {
        const nom = escapeHtml(String(data.nom ?? ""));
        const comite = escapeHtml(String(data.comite ?? "COPIL"));
        const mission = escapeHtml(String(data.mission ?? "la mission"));
        const code = String(data.code);

        const result = await sendResend({
          to: email,
          subject: `Code d'accès au portail ${String(data.comite ?? "COPIL")}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #1a1a1a; margin-bottom: 8px;">Portail documents ${comite}</h2>
              <p style="color: #555;">Bonjour ${nom},</p>
              <p style="color: #555;">Voici votre code d'accès au portail documents du ${comite} pour <strong>${mission}</strong> :</p>
              <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${code}</span>
              </div>
              <p style="color: #888; font-size: 13px;">Ce code est valable <strong>15 minutes</strong>, pour une seule connexion.</p>
              <p style="color: #888; font-size: 13px;">Si vous n'êtes pas à l'origine de cette demande, ignorez ce courriel.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="color: #aaa; font-size: 12px;">Mission-DGC — Plateforme de gestion de missions</p>
            </div>
          `,
        });
        if (!result.ok) {
          console.error("copil send-otp: envoi du courriel en échec");
        }
      }

      return jsonResponse(req, 200, { success: true, message: MESSAGE_ENVOI });
    }

    // ── Vérifier le code ────────────────────────────────────────────────
    if (action === "verify-otp") {
      const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
      const otp = typeof body?.otp === "string" ? body.otp.trim() : String(body?.otp ?? "");
      if (!EMAIL.test(email) || !/^\d{6}$/.test(otp)) {
        return jsonResponse(req, 401, { error: "Code invalide ou expiré" });
      }

      const { data, error } = await admin.rpc("copil_verifier_code", {
        _committee_id: committeeId,
        _email: email,
        _code: otp,
      });
      if (error) {
        console.error("copil verify-otp: rpc", error.code);
        return jsonResponse(req, 500, { error: "Le service est momentanément indisponible." });
      }
      if (!data?.ok) {
        return jsonResponse(req, 401, { error: "Code invalide ou expiré" });
      }

      return jsonResponse(req, 200, { success: true, session_token: data.jeton });
    }

    // ── Les documents ───────────────────────────────────────────────────
    if (action === "get-documents") {
      const sessionToken = typeof body?.session_token === "string" ? body.session_token : "";
      if (!/^[0-9a-f]{64}$/.test(sessionToken)) {
        return jsonResponse(req, 401, { error: "Session invalide ou expirée" });
      }

      // Jeton bon, non expiré, personne toujours membre, mission ouverte.
      const { data: session, error: sessionError } = await admin.rpc("copil_session", {
        _committee_id: committeeId,
        _jeton: sessionToken,
      });
      if (sessionError) {
        console.error("copil get-documents: rpc", sessionError.code);
        return jsonResponse(req, 500, { error: "Le service est momentanément indisponible." });
      }
      if (!session?.ok) {
        return jsonResponse(req, 401, { error: "Session invalide ou expirée" });
      }

      const { data: committee } = await admin
        .from("committees")
        .select("id, name, type, mission_id, missions:missions!committees_mission_id_fkey(name, code, status, progress)")
        .eq("id", committeeId)
        .single();

      // Documents du comité, publiés ou approuvés
      const { data: copilDocs } = await admin
        .from("documents")
        .select("id, name, file_path, mime_type, file_size, created_at, status, version")
        .eq("committee_id", committeeId)
        .in("status", ["published", "approved"])
        .order("created_at", { ascending: false });

      // Réunions du comité et leurs comptes rendus
      const { data: meetings } = await admin
        .from("committee_meetings")
        .select("id, title, scheduled_at, status, minutes_document_id, decisions")
        .eq("committee_id", committeeId)
        .order("scheduled_at", { ascending: false });

      const minuteDocIds = (meetings || [])
        .map((m: { minutes_document_id: string | null }) => m.minutes_document_id)
        .filter((id: string | null): id is string => !!id);

      let minuteDocs: Array<Record<string, unknown>> = [];
      if (minuteDocIds.length > 0) {
        const { data } = await admin
          .from("documents")
          .select("id, name, file_path, mime_type, file_size, created_at, status, version")
          .in("id", minuteDocIds);
        minuteDocs = data || [];
      }

      const allDocs = [...(copilDocs || []), ...minuteDocs];
      const uniqueDocs = allDocs.filter(
        (doc, idx, arr) => arr.findIndex((d) => d.id === doc.id) === idx,
      );

      const documents = await Promise.all(
        uniqueDocs.map(async (doc) => {
          const { data: signed } = await admin.storage
            .from("documents")
            .createSignedUrl(String(doc.file_path), 900); // 15 minutes
          return { ...doc, signed_url: signed?.signedUrl || null };
        }),
      );

      return jsonResponse(req, 200, { committee, documents, meetings: meetings || [] });
    }

    return jsonResponse(req, 400, { error: "Action inconnue" });
  } catch (_e) {
    console.error("copil-portal-auth: erreur interne");
    return jsonResponse(req, 500, { error: "Le service est momentanément indisponible." });
  }
});
