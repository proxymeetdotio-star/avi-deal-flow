import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

const EQUITY_DOCS = [
  "Teaser",
  "Information Memorandum",
  "Investor Deck",
  "Financial Model Summary",
  "Term Sheet",
  "Risk Memo",
  "Process Letter",
] as const;

const DEBT_DOCS = [
  "Teaser",
  "Information Memorandum",
  "Investor Deck",
  "Financial Model Summary",
  "Term Sheet",
  "Risk Memo",
  "Debt Structure Memo",
  "Covenant Pack",
] as const;

type DocKind =
  | typeof EQUITY_DOCS[number]
  | typeof DEBT_DOCS[number]
  | "Sharia Compliance Memo";

function formatFor(kind: DocKind): "pdf" | "docx" | "pptx" {
  if (kind === "Investor Deck") return "pptx";
  if (kind === "Term Sheet" || kind === "Covenant Pack") return "docx";
  return "pdf";
}

const SYSTEM = `You are Avi, an AI investment banking analyst for GCC private capital.
You draft institutional-grade deal documents for a sponsor seeking capital.

ABSOLUTE NO-ASSUMPTIONS RULE:
- Use ONLY data explicitly provided in the mandate fields and analyzed source documents below.
- Never invent figures, returns, IRRs, timelines, comparable deals, party names, addresses, or terms.
- If a needed data point is missing, write exactly: "Information not provided — to be supplied by sponsor."
- Do not soften risks. Flag every material concern surfaced in the inputs.
- All output must be in English unless source documents are in another language.

Return STRICTLY valid JSON for the requested document type per the schema in the user message.`;

function schemaFor(kind: DocKind): { description: string; shape: string } {
  const sections = (arr: string[]) =>
    `{ "title": string, "subtitle": string | null, "sections": [ ${arr
      .map((s) => `{ "heading": "${s}", "body": string }`)
      .join(", ")} ], "disclaimer": string }`;
  switch (kind) {
    case "Teaser":
      return { description: "1-page blind teaser, no sponsor identity unless explicit.", shape: sections(["Opportunity", "Asset Snapshot", "Capital Ask", "Use of Proceeds", "Indicative Returns / Terms", "Process"]) };
    case "Information Memorandum":
      return { description: "Long-form IM, multiple sections.", shape: sections(["Executive Summary", "Sponsor Overview", "Asset / Business Description", "Market Context", "Financial Summary", "Capital Structure", "Investment Highlights", "Risk Factors", "Process & Timeline"]) };
    case "Investor Deck":
      return { description: "Slide deck. Return an array of slides instead of sections.", shape: `{ "title": string, "subtitle": string | null, "slides": [ { "heading": string, "bullets": string[], "notes": string | null } ], "disclaimer": string }` };
    case "Financial Model Summary":
      return { description: "Concise summary of financials from sponsor inputs / docs.", shape: sections(["Revenue & EBITDA Snapshot", "Capital Structure Today", "Sources & Uses", "Sensitivity Notes", "Assumptions Provided by Sponsor"]) };
    case "Term Sheet":
      return { description: "Indicative term sheet.", shape: sections(["Issuer / Sponsor", "Instrument", "Size", "Pricing / Coupon / Equity Terms", "Tenor", "Use of Proceeds", "Security / Covenants", "Conditions Precedent", "Governing Law"]) };
    case "Risk Memo":
      return { description: "Credit / investment risk memo.", shape: sections(["Market Risk", "Sponsor Risk", "Asset / Operational Risk", "Financial Risk", "Regulatory & Sharia Risk", "Mitigants Provided"]) };
    case "Process Letter":
      return { description: "Process letter to prospective investors.", shape: sections(["Background", "Proposed Process", "Required Submissions", "Key Dates", "Confidentiality"]) };
    case "Debt Structure Memo":
      return { description: "Debt-specific structuring memo.", shape: sections(["Proposed Facility", "Tranching", "Security Package", "Cash Sweep / Amortisation", "Hedging Considerations", "Sharia Wrapper Notes"]) };
    case "Covenant Pack":
      return { description: "Covenant pack for debt facility.", shape: sections(["Financial Covenants", "Information Covenants", "Negative Covenants", "Events of Default", "Reporting Cadence"]) };
    case "Sharia Compliance Memo":
      return { description: "Sharia compliance review of the proposed structure.", shape: sections(["Sharia Status Selected", "Structure Suitability", "Prohibited Elements Identified", "Recommended Structure (Murabaha / Ijara / Wakala / Mudaraba)", "Required Sharia Board Review Steps"]) };
  }
}

async function generateOne(kind: DocKind, mandate: any, docsContext: string, apiKey: string) {
  const { description, shape } = schemaFor(kind);
  const userMsg = `Generate the following deal document: ${kind}.
Purpose: ${description}

Mandate Inputs:
- Sponsor: ${mandate.sponsor_name}
- Company: ${mandate.company_name}
- Deal Type: ${mandate.deal_type}
- Asset Class: ${mandate.asset_class ?? "Information not provided"}
- Geography: ${mandate.geography ?? "Information not provided"}
- Capital Sought: ${mandate.capital_sought}
- Use of Proceeds: ${mandate.use_of_proceeds ?? "Information not provided"}
- Sponsor Track Record: ${mandate.sponsor_track_record ?? "Information not provided"}
- Financial Summary: ${mandate.financial_summary ?? "Information not provided"}
- Sharia Status: ${mandate.sharia_status}

Analyzed Source Documents:
${docsContext || "(none analyzed yet)"}

Return ONLY JSON matching this shape:
${shape}

Where the "disclaimer" field must be the string: "Prepared by Avi. Regulated by the DFSA via Index & Cie. This document is for informational purposes only and does not constitute an offer to invest or lend."`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userMsg }],
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    if (resp.status === 429) throw new Error("AI rate limit reached. Please retry.");
    if (resp.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI generation failed for ${kind}: ${resp.status} ${t.slice(0, 200)}`);
  }
  const payload = await resp.json();
  const content = payload?.choices?.[0]?.message?.content;
  try {
    return typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    throw new Error(`AI returned malformed JSON for ${kind}`);
  }
}

export const generateMandatePackage = createServerFn({ method: "POST" })
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
      .map((d: any) => `### ${d.file_name} (${d.doc_type})\n${JSON.stringify(d.analysis)}`)
      .join("\n\n");

    const base = mandate.deal_type === "Debt" ? DEBT_DOCS : EQUITY_DOCS;
    const kinds: DocKind[] = [...base];
    if (mandate.sharia_status === "Required") kinds.push("Sharia Compliance Memo");

    // Reset existing generated rows for clean regenerate
    await context.supabase.from("mandate_generated_documents").delete().eq("mandate_id", data.mandateId);

    const results: { kind: DocKind; ok: boolean; error?: string }[] = [];
    for (const kind of kinds) {
      const row = {
        mandate_id: data.mandateId,
        doc_kind: kind,
        format: formatFor(kind),
        status: "generating",
      };
      const { data: created, error: ce } = await context.supabase
        .from("mandate_generated_documents").insert(row).select("id").single();
      if (ce) { results.push({ kind, ok: false, error: ce.message }); continue; }
      try {
        const content = await generateOne(kind, mandate, docsContext, apiKey);
        await context.supabase
          .from("mandate_generated_documents")
          .update({ content, status: "ready", generated_at: new Date().toISOString() })
          .eq("id", created.id);
        results.push({ kind, ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        await context.supabase
          .from("mandate_generated_documents")
          .update({ status: "error", error: msg })
          .eq("id", created.id);
        results.push({ kind, ok: false, error: msg });
      }
    }

    await context.supabase.from("mandates").update({ stage: "Ready to Package" }).eq("id", data.mandateId);
    return { ok: true, results };
  });
