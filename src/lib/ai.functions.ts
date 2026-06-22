import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  assessmentTitle: z.string().min(1).max(200),
  fields: z.record(z.string(), z.string().max(4000)),
});

export const FUNDING_PURPOSES = [
  "Working Capital",
  "Trade Finance",
  "Inventory Purchase",
  "Import Financing",
  "Export Financing",
  "Equipment Purchase",
  "Asset Finance",
  "Expansion",
  "Acquisition",
  "Project Finance",
  "Real Estate",
  "Construction Finance",
  "Bridge Funding",
  "Debt Refinancing",
  "Equity Capital",
] as const;

export type FundabilityRating = "High" | "Medium" | "Low";

export interface ScoreBreakdown {
  revenue: number;
  years_in_operation: number;
  financial_statements: number;
  existing_debt: number;
  cashflow_strength: number;
  documentation_completeness: number;
}

export interface FinancingRecommendation {
  funding_requirement: string;
  recommended_instruments: string[];
  less_suitable_instruments: string[];
  explanation: string;
}

export interface AssessmentReport {
  readiness_score_100: number;
  fundability_rating: FundabilityRating;
  score_breakdown: ScoreBreakdown;
  executive_summary: string;
  financing_recommendation: FinancingRecommendation;
  key_risks: string[];
  suggested_next_steps: string[];
  sharia_assessment: string | null;
}

const SYSTEM = `You are Avi, an AI investment banking analyst for GCC private capital markets.
You produce institutional-grade funding-readiness assessments for sponsors raising capital.

ABSOLUTE RULES:
- Use ONLY information explicitly provided by the user in the form inputs below.
- If a data point is not provided, write exactly: "Information not provided — to be supplied by sponsor."
- Do NOT invent figures, returns, timelines, or comparable transactions.
- Do NOT sanitize risks. Be honest and credit-focused.
- Sharia assessment is included ONLY when the sponsor selected Required, Yes, or Preferred — otherwise null.
- Scores must be defensible from provided inputs. If insufficient information, score conservatively and state why in the executive_summary.

SCORING (0–100, integer):
- Weight the six drivers: Revenue (20), Years in Operation (10), Financial Statements provided (20),
  Existing Debt burden (15), Cashflow Strength (20), Documentation Completeness (15).
- Each driver is scored 0–100 in score_breakdown; the top-level readiness_score_100 is the weighted sum.
- fundability_rating: High if score ≥ 75, Medium if 50–74, Low if < 50.

FINANCING RECOMMENDATION:
- Pick recommended_instruments from this universe (use exact names where applicable):
  Working Capital Facility, Trade Finance, Invoice Discounting, Inventory Financing,
  Import LC, Export LC, Equipment Finance / Asset Lease, Term Loan, Mezzanine,
  Acquisition Finance, Project Finance, Real Estate Development Loan, Construction Finance,
  Bridge Loan, Senior Debt Refinancing, Sukuk / Islamic Finance, Growth Equity, Private Equity,
  Joint Venture Equity.
- Rank recommended_instruments by suitability given the funding purpose, use of funds, deal type,
  sharia status, and the sponsor's stage/financials.
- less_suitable_instruments: 2–4 items the sponsor should NOT pursue, with the reason in explanation.
- explanation: 3–6 sentences tying recommendation to the sponsor's specific inputs.

Return STRICTLY valid JSON matching this TypeScript type:
{
  "readiness_score_100": number,           // 0-100 integer
  "fundability_rating": "High" | "Medium" | "Low",
  "score_breakdown": {
    "revenue": number,                     // 0-100
    "years_in_operation": number,          // 0-100
    "financial_statements": number,        // 0-100
    "existing_debt": number,               // 0-100 (100 = no/low debt burden)
    "cashflow_strength": number,           // 0-100
    "documentation_completeness": number   // 0-100
  },
  "executive_summary": string,             // 3-4 sentences
  "financing_recommendation": {
    "funding_requirement": string,         // echo amount + purpose
    "recommended_instruments": string[],   // 2-5 items, ranked
    "less_suitable_instruments": string[], // 2-4 items
    "explanation": string                  // 3-6 sentences
  },
  "key_risks": string[],                   // minimum 5, from inputs only
  "suggested_next_steps": string[],        // 3-6 concrete actions
  "sharia_assessment": string | null       // null unless Required/Yes/Preferred
}`;

export const generateAssessmentReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<AssessmentReport> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const fieldsBlock = Object.entries(data.fields)
      .map(([k, v]) => `- ${k}: ${v?.trim() ? v : "(not provided)"}`)
      .join("\n");

    const userPrompt = `Assessment: ${data.assessmentTitle}

Sponsor inputs:
${fieldsBlock}

Produce the JSON report now.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      if (resp.status === 429) throw new Error("AI rate limit reached. Please try again shortly.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
      throw new Error(`AI request failed: ${resp.status} ${text.slice(0, 200)}`);
    }

    const payload = await resp.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");

    let parsed: AssessmentReport;
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      throw new Error("AI returned malformed JSON");
    }

    const score = clamp100(parsed.readiness_score_100);
    const rating: FundabilityRating =
      score >= 75 ? "High" : score >= 50 ? "Medium" : "Low";

    return {
      readiness_score_100: score,
      fundability_rating: parsed.fundability_rating ?? rating,
      score_breakdown: {
        revenue: clamp100(parsed.score_breakdown?.revenue),
        years_in_operation: clamp100(parsed.score_breakdown?.years_in_operation),
        financial_statements: clamp100(parsed.score_breakdown?.financial_statements),
        existing_debt: clamp100(parsed.score_breakdown?.existing_debt),
        cashflow_strength: clamp100(parsed.score_breakdown?.cashflow_strength),
        documentation_completeness: clamp100(parsed.score_breakdown?.documentation_completeness),
      },
      executive_summary: str(parsed.executive_summary),
      financing_recommendation: {
        funding_requirement: str(parsed.financing_recommendation?.funding_requirement),
        recommended_instruments: arr(parsed.financing_recommendation?.recommended_instruments),
        less_suitable_instruments: arr(parsed.financing_recommendation?.less_suitable_instruments),
        explanation: str(parsed.financing_recommendation?.explanation),
      },
      key_risks: arr(parsed.key_risks),
      suggested_next_steps: arr(parsed.suggested_next_steps),
      sharia_assessment: parsed.sharia_assessment ? str(parsed.sharia_assessment) : null,
    };
  });

function clamp100(n: unknown): number {
  const v = typeof n === "number" ? Math.round(n) : 0;
  return Math.max(0, Math.min(100, v || 0));
}
function str(v: unknown): string {
  return typeof v === "string" && v.trim()
    ? v
    : "Information not provided — to be supplied by sponsor.";
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)) : [];
}
