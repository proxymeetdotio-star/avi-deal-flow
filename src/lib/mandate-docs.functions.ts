import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

const ANALYSIS_SYSTEM = `You are Avi's document analyst for GCC private capital deals.
Your job is to extract verifiable facts from the uploaded source document.

ABSOLUTE RULES — NO ASSUMPTIONS:
- Use ONLY information explicitly present in the document.
- Do NOT infer, estimate, or extrapolate any figure, name, date, or term.
- If a field is not found, return null and add the field name to "missing_info".
- Do NOT sanitize risks. Flag red flags candidly.

Return STRICTLY valid JSON:
{
  "summary": string,
  "doc_type_detected": string,
  "key_terms": string[],
  "financials_extracted": { "label": string, "value": string }[],
  "parties_identified": string[],
  "dates_identified": string[],
  "red_flags": string[],
  "missing_info": string[]
}`;

export const analyzeMandateDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ documentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { data: doc, error } = await context.supabase
      .from("mandate_documents").select("*").eq("id", data.documentId).single();
    if (error) throw new Error(error.message);
    if (!doc) throw new Error("Document not found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: fileBlob, error: dlErr } = await supabaseAdmin.storage
      .from("mandate-files").download(doc.storage_path);
    if (dlErr || !fileBlob) throw new Error(dlErr?.message ?? "Failed to download file");

    const buf = Buffer.from(await fileBlob.arrayBuffer());
    const b64 = buf.toString("base64");
    const mime = doc.mime_type || "application/octet-stream";

    let contentBlocks: any[];
    if (mime.startsWith("image/")) {
      contentBlocks = [
        { type: "text", text: `Analyze this document. Labeled type: ${doc.doc_type}. File name: ${doc.file_name}.` },
        { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
      ];
    } else if (mime === "application/pdf") {
      contentBlocks = [
        { type: "text", text: `Analyze this document. Labeled type: ${doc.doc_type}. File name: ${doc.file_name}.` },
        { type: "file", file: { filename: doc.file_name, file_data: `data:application/pdf;base64,${b64}` } },
      ];
    } else {
      // Best-effort text decode for other types
      const text = buf.toString("utf8").slice(0, 60000);
      contentBlocks = [{ type: "text", text: `Analyze this document. Labeled type: ${doc.doc_type}. File name: ${doc.file_name}.\n\nCONTENT:\n${text}` }];
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: ANALYSIS_SYSTEM },
          { role: "user", content: contentBlocks },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      if (resp.status === 429) throw new Error("AI rate limit reached. Please retry.");
      if (resp.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI analysis failed: ${resp.status} ${t.slice(0, 200)}`);
    }
    const payload = await resp.json();
    const content = payload?.choices?.[0]?.message?.content;
    let analysis: unknown;
    try {
      analysis = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      throw new Error("AI returned malformed JSON");
    }

    const { error: upErr } = await context.supabase
      .from("mandate_documents")
      .update({ analysis, analyzed_at: new Date().toISOString() })
      .eq("id", doc.id);
    if (upErr) throw new Error(upErr.message);

    return { ok: true, analysis };
  });
