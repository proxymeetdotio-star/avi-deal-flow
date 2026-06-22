import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export interface DocReview {
  missing_documents: string[];
  outdated_documents: string[];
  recommended_additional_information: string[];
  summary: string;
  reviewed_at: string;
}

export interface DealMemo {
  company_overview: string;
  funding_requirement: string;
  use_of_funds: string;
  key_strengths: string[];
  key_risks: string[];
  recommended_financing_products: string[];
  recommended_financier_types: string[];
  generated_at: string;
}

async function callAi(system: string, user: string, apiKey: string) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    if (resp.status === 429) throw new Error("AI rate limit reached. Please retry.");
    if (resp.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI request failed: ${resp.status} ${t.slice(0, 200)}`);
  }
  const payload = await resp.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");
  try {
    return typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    throw new Error("AI returned malformed JSON");
  }
}

const NO_ASSUMPTIONS = `Use ONLY the information explicitly provided.
If a data point is missing, mark it explicitly. Never invent figures, names, terms, or comparables.`;

export const reviewMandateDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ mandateId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { data: mandate, error: me } = await context.supabase
      .from("mandates").select("*").eq("id", data.mandateId).single();
    if (me) throw new Error(me.message);

    const { data: docs } = await context.supabase
      .from("mandate_documents")
      .select("file_name, doc_type, analysis, analyzed_at, created_at")
      .eq("mandate_id", data.mandateId);

    const docsList = (docs ?? [])
      .map(
        (d: any) =>
          `- ${d.file_name} [${d.doc_type}] uploaded ${d.created_at}${d.analyzed_at ? " · analyzed" : " · not analyzed"}${d.analysis ? `\n  analysis: ${JSON.stringify(d.analysis).slice(0, 600)}` : ""}`,
      )
      .join("\n") || "(no documents uploaded)";

    const system = `You are Avi, an AI investment banking analyst. Review the documents uploaded for a capital-raising mandate and identify gaps.
${NO_ASSUMPTIONS}

Return STRICTLY valid JSON:
{
  "missing_documents": string[],                 // documents typically required for this deal type / asset class / sharia status that are not present
  "outdated_documents": string[],                // uploaded items that look stale (e.g. financial statements older than 18 months) — only if evidence exists in the analysis
  "recommended_additional_information": string[],// extra clarifications/data the sponsor should provide
  "summary": string                              // 2-3 sentence summary for the deal team
}`;

    const user = `Mandate:
- Deal Type: ${mandate.deal_type}
- Asset Class: ${mandate.asset_class ?? "(not provided)"}
- Geography: ${mandate.geography ?? "(not provided)"}
- Capital Sought: ${mandate.capital_sought}
- Funding Purpose: ${mandate.funding_purpose ?? "(not provided)"}
- Use of Funds: ${mandate.use_of_funds_detail ?? mandate.use_of_proceeds ?? "(not provided)"}
- Sharia Status: ${mandate.sharia_status}

Uploaded documents:
${docsList}

Produce the JSON document-completeness review now.`;

    const parsed = await callAi(system, user, apiKey);

    const review: DocReview = {
      missing_documents: Array.isArray(parsed.missing_documents) ? parsed.missing_documents.map(String) : [],
      outdated_documents: Array.isArray(parsed.outdated_documents) ? parsed.outdated_documents.map(String) : [],
      recommended_additional_information: Array.isArray(parsed.recommended_additional_information)
        ? parsed.recommended_additional_information.map(String) : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      reviewed_at: new Date().toISOString(),
    };

    const { error: ue } = await context.supabase
      .from("mandates").update({ doc_review: review as unknown as never }).eq("id", data.mandateId);
    if (ue) throw new Error(ue.message);
    return review;
  });

export const generateDealMemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ mandateId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { data: mandate, error: me } = await context.supabase
      .from("mandates").select("*").eq("id", data.mandateId).single();
    if (me) throw new Error(me.message);

    const { data: docs } = await context.supabase
      .from("mandate_documents")
      .select("file_name, doc_type, analysis")
      .eq("mandate_id", data.mandateId)
      .not("analysis", "is", null);
    const docsContext = (docs ?? [])
      .map((d: any) => `### ${d.file_name} (${d.doc_type})\n${JSON.stringify(d.analysis).slice(0, 800)}`)
      .join("\n\n") || "(no analyzed documents)";

    const system = `You are Avi, an AI investment banking analyst. Draft an internal investment memo for the deal team.
${NO_ASSUMPTIONS}

Return STRICTLY valid JSON:
{
  "company_overview": string,                 // 2-4 sentences
  "funding_requirement": string,              // amount + purpose
  "use_of_funds": string,                     // 1-3 sentences
  "key_strengths": string[],                  // 3-6
  "key_risks": string[],                      // minimum 5
  "recommended_financing_products": string[], // ranked
  "recommended_financier_types": string[]     // e.g. Regional Bank, Islamic Bank, Private Credit Fund, Growth Equity, Family Office, DFI
}`;

    const user = `Mandate inputs:
- Sponsor: ${mandate.sponsor_name}
- Company: ${mandate.company_name}
- Deal Type: ${mandate.deal_type}
- Asset Class: ${mandate.asset_class ?? "(not provided)"}
- Geography: ${mandate.geography ?? "(not provided)"}
- Capital Sought: ${mandate.capital_sought}
- Funding Purpose: ${mandate.funding_purpose ?? "(not provided)"}
- Use of Funds: ${mandate.use_of_funds_detail ?? mandate.use_of_proceeds ?? "(not provided)"}
- Years in Operation: ${mandate.years_in_operation ?? "(not provided)"}
- Existing Debt: ${mandate.existing_debt ?? "(not provided)"}
- Cashflow Strength: ${mandate.cashflow_strength ?? "(not provided)"}
- Sponsor Track Record: ${mandate.sponsor_track_record ?? "(not provided)"}
- Financial Summary: ${mandate.financial_summary ?? "(not provided)"}
- Sharia Status: ${mandate.sharia_status}
- Readiness Score (0-100): ${mandate.readiness_score_100 ?? "(not computed)"}
- Fundability Rating: ${mandate.fundability_rating ?? "(not computed)"}

Analyzed Source Documents:
${docsContext}

Produce the JSON internal deal memo now.`;

    const parsed = await callAi(system, user, apiKey);
    const memo: DealMemo = {
      company_overview: typeof parsed.company_overview === "string" ? parsed.company_overview : "",
      funding_requirement: typeof parsed.funding_requirement === "string" ? parsed.funding_requirement : "",
      use_of_funds: typeof parsed.use_of_funds === "string" ? parsed.use_of_funds : "",
      key_strengths: Array.isArray(parsed.key_strengths) ? parsed.key_strengths.map(String) : [],
      key_risks: Array.isArray(parsed.key_risks) ? parsed.key_risks.map(String) : [],
      recommended_financing_products: Array.isArray(parsed.recommended_financing_products)
        ? parsed.recommended_financing_products.map(String) : [],
      recommended_financier_types: Array.isArray(parsed.recommended_financier_types)
        ? parsed.recommended_financier_types.map(String) : [],
      generated_at: new Date().toISOString(),
    };

    const { error: ue } = await context.supabase
      .from("mandates").update({ deal_memo: memo as unknown as never }).eq("id", data.mandateId);
    if (ue) throw new Error(ue.message);
    return memo;
  });
