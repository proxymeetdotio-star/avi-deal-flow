import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  assessmentTitle: z.string().min(1).max(200),
  fields: z.record(z.string(), z.string().max(4000)),
});

export interface AssessmentReport {
  funding_readiness_score: number;
  investor_attractiveness_score: number;
  capital_structure_recommendation: string;
  key_risks: string[];
  suggested_next_steps: string[];
  sharia_assessment: string | null;
  executive_summary: string;
}

const SYSTEM = `You are Avi, an AI investment banking analyst for GCC private capital markets.
You produce institutional-grade assessment reports for sponsors raising capital.

ABSOLUTE RULES:
- Use ONLY information explicitly provided by the user in the form inputs below.
- If a data point is not provided, write exactly: "Information not provided — to be supplied by sponsor."
- Do NOT invent figures, returns, timelines, or comparable transactions.
- Do NOT sanitize risks. Be honest and credit-focused.
- Sharia assessment is included ONLY when the sponsor selected Required or Preferred.
- Scores (1-10) must be defensible from provided inputs. If insufficient information, score conservatively and state why.

Return STRICTLY valid JSON matching this TypeScript type:
{
  "funding_readiness_score": number,            // 1-10
  "investor_attractiveness_score": number,      // 1-10
  "executive_summary": string,                  // 3-4 sentences, plain language
  "capital_structure_recommendation": string,   // 2-4 sentences
  "key_risks": string[],                        // minimum 5, from inputs only
  "suggested_next_steps": string[],             // 3-6 concrete actions
  "sharia_assessment": string | null            // null unless Required/Preferred
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
        model: "google/gemini-3-flash-preview",
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

    // Defensive defaults — never invent, but ensure shape
    return {
      funding_readiness_score: clampScore(parsed.funding_readiness_score),
      investor_attractiveness_score: clampScore(parsed.investor_attractiveness_score),
      executive_summary: str(parsed.executive_summary),
      capital_structure_recommendation: str(parsed.capital_structure_recommendation),
      key_risks: arr(parsed.key_risks),
      suggested_next_steps: arr(parsed.suggested_next_steps),
      sharia_assessment: parsed.sharia_assessment ? str(parsed.sharia_assessment) : null,
    };
  });

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? Math.round(n) : 0;
  return Math.max(1, Math.min(10, v || 1));
}
function str(v: unknown): string {
  return typeof v === "string" ? v : "Information not provided — to be supplied by sponsor.";
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)) : [];
}
