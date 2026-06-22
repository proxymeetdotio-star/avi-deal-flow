import { createFileRoute, notFound, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { assessmentBySlug, type AssessmentMeta } from "@/lib/assessments";
import {
  generateAssessmentReport,
  FUNDING_PURPOSES,
  type AssessmentReport,
} from "@/lib/ai.functions";
import { generateAssessmentPdf } from "@/lib/pdf";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/assessment/$slug")({
  loader: ({ params }) => {
    const meta = assessmentBySlug(params.slug);
    if (!meta) throw notFound();
    return { meta };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.meta.title} — Avi` },
      { name: "description", content: loaderData?.meta.short ?? "" },
    ],
  }),
  component: AssessmentPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-[color:var(--color-muted-foreground)]">Not Found</p>
      <h1 className="mt-3 text-2xl font-bold">Assessment not found</h1>
      <Link to="/" className="avi-btn-primary mt-6 inline-block">Back to assessments</Link>
    </div>
  ),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="avi-btn-primary mt-6">Retry</button>
      </div>
    );
  },
});

interface FormState {
  // assessment
  project_type: string;
  funding_amount: string;
  funding_purpose: string;
  use_of_funds_detail: string;
  location: string;
  development_stage: string;
  revenue: string;
  ebitda: string;
  years_in_operation: string;
  existing_debt: string;
  cashflow_strength: "Strong" | "Adequate" | "Weak" | "Unknown";
  expected_returns: string;
  financing_structure: string;
  sharia_requirement: "Yes" | "No" | "Preferred";
  additional_notes: string;
  // lead capture
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  deal_type: "Equity" | "Debt";
}

const EMPTY: FormState = {
  project_type: "",
  funding_amount: "",
  funding_purpose: "",
  use_of_funds_detail: "",
  location: "",
  development_stage: "",
  revenue: "",
  ebitda: "",
  years_in_operation: "",
  existing_debt: "",
  cashflow_strength: "Unknown",
  expected_returns: "",
  financing_structure: "",
  sharia_requirement: "No",
  additional_notes: "",
  full_name: "",
  company_name: "",
  email: "",
  phone: "",
  deal_type: "Equity",
};

const LeadSchema = z.object({
  full_name: z.string().trim().min(1, "Full name required").max(120),
  company_name: z.string().trim().min(1, "Company required").max(160),
  email: z.string().trim().email("Valid email required").max(200),
  phone: z.string().trim().min(4, "Phone required").max(40),
  deal_type: z.enum(["Equity", "Debt"]),
});

function AssessmentPage() {
  const { meta } = Route.useLoaderData();
  const [step, setStep] = useState<"form" | "lead" | "report">("form");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [report, setReport] = useState<AssessmentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const generate = useServerFn(generateAssessmentReport);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const inputsForReport = (): Record<string, string> => ({
    "Project / business type": form.project_type,
    "Funding amount required (USD)": form.funding_amount,
    "Funding purpose": form.funding_purpose,
    "Detailed use of funds": form.use_of_funds_detail,
    "Location": form.location,
    "Development stage": form.development_stage,
    "Revenue (USD, last full year)": form.revenue,
    "EBITDA (USD, last full year)": form.ebitda,
    "Years in operation": form.years_in_operation,
    "Existing debt (USD)": form.existing_debt,
    "Cashflow strength": form.cashflow_strength,
    "Expected returns": form.expected_returns,
    "Preferred financing structure": form.financing_structure,
    "Sharia requirement": form.sharia_requirement,
    "Additional notes": form.additional_notes,
  });

  const handleGenerate = async () => {
    const parsed = LeadSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please complete all required fields");
      return;
    }
    setLoading(true);
    try {
      const result = await generate({
        data: { assessmentTitle: meta.title, fields: inputsForReport() },
      });
      setReport(result);

      const { error } = await supabase.from("leads").insert({
        assessment_type: meta.key,
        full_name: form.full_name,
        company_name: form.company_name,
        email: form.email,
        phone: form.phone,
        capital_sought: form.funding_amount,
        funding_amount: parseNumeric(form.funding_amount),
        funding_purpose: form.funding_purpose || null,
        use_of_funds_detail: form.use_of_funds_detail || null,
        years_in_operation: parseInt10(form.years_in_operation),
        existing_debt: parseNumeric(form.existing_debt),
        cashflow_strength: form.cashflow_strength,
        deal_type: form.deal_type,
        inputs: inputsForReport(),
        readiness_score_100: result.readiness_score_100,
        fundability_rating: result.fundability_rating,
        report: result as unknown as never,
      });
      if (error) console.error("lead insert", error);

      setStep("report");
      toast.success("Your Avi report is ready.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const doc = generateAssessmentPdf({
      assessmentTitle: meta.title,
      lead: {
        full_name: form.full_name,
        company_name: form.company_name,
        email: form.email,
        phone: form.phone,
        capital_sought: form.funding_amount,
        deal_type: form.deal_type,
      },
      inputs: inputsForReport(),
      report,
    });
    doc.save(`Avi-${meta.slug}-${Date.now()}.pdf`);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <Link to="/" className="text-xs uppercase tracking-widest text-[color:var(--color-muted-foreground)] hover:underline">
        ← All assessments
      </Link>

      <div className="mt-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[color:var(--color-muted-foreground)]">
          Avi Assessment
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">{meta.title}</h1>
        <p className="mt-3 text-sm text-[color:var(--color-muted-foreground)] leading-relaxed">{meta.description}</p>
      </div>

      <Steps current={step} />

      {step === "form" && <FormStep meta={meta} form={form} set={set} onNext={() => setStep("lead")} />}
      {step === "lead" && (
        <LeadStep form={form} set={set} onBack={() => setStep("form")} onSubmit={handleGenerate} loading={loading} />
      )}
      {step === "report" && report && (
        <ReportStep meta={meta} report={report} onDownload={handleDownload} onReset={() => { setStep("form"); setForm(EMPTY); setReport(null); }} />
      )}
    </div>
  );
}

function parseNumeric(s: string): number | null {
  const n = Number((s || "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) && n !== 0 ? n : null;
}
function parseInt10(s: string): number | null {
  const n = parseInt((s || "").replace(/[^0-9\-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function Steps({ current }: { current: "form" | "lead" | "report" }) {
  const items: Array<["form" | "lead" | "report", string]> = [
    ["form", "Inputs"],
    ["lead", "Your Details"],
    ["report", "Report"],
  ];
  const idx = items.findIndex(([k]) => k === current);
  return (
    <ol className="mt-8 flex items-center gap-3 text-[11px] uppercase tracking-widest">
      {items.map(([k, label], i) => (
        <li key={k} className="flex items-center gap-3">
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold"
            style={{
              borderColor: i <= idx ? "var(--color-foreground)" : "var(--color-border)",
              backgroundColor: i <= idx ? "var(--color-foreground)" : "transparent",
              color: i <= idx ? "var(--color-background)" : "var(--color-muted-foreground)",
            }}
          >
            {i + 1}
          </span>
          <span className={i === idx ? "font-bold" : "text-[color:var(--color-muted-foreground)]"}>{label}</span>
          {i < items.length - 1 && <span className="w-8 h-px" style={{ backgroundColor: "var(--color-border)" }} />}
        </li>
      ))}
    </ol>
  );
}

function Field(props: { label: string; children: React.ReactNode; hint?: string; full?: boolean }) {
  return (
    <label className={`block ${props.full ? "md:col-span-2" : ""}`}>
      <span className="avi-label">{props.label}</span>
      {props.children}
      {props.hint && <span className="mt-1 block text-[11px] text-[color:var(--color-muted-foreground)]">{props.hint}</span>}
    </label>
  );
}

function FormStep({
  meta, form, set, onNext,
}: {
  meta: AssessmentMeta;
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onNext: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.funding_purpose) { toast.error("Please select a funding purpose."); return; }
        if (!form.use_of_funds_detail.trim()) { toast.error("Please describe the use of funds."); return; }
        onNext();
      }}
      className="avi-card mt-10 p-6 md:p-8 space-y-6"
    >
      <p className="text-xs text-[color:var(--color-muted-foreground)]">
        Provide only information you can substantiate. Avi will mark any missing data as
        "Information not provided" rather than inventing figures.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Project / business type">
          <input className="avi-input" required maxLength={200} value={form.project_type} onChange={(e) => set("project_type", e.target.value)} />
        </Field>
        <Field label="Funding amount required (USD)">
          <input className="avi-input" required maxLength={80} placeholder="e.g. 25,000,000" value={form.funding_amount} onChange={(e) => set("funding_amount", e.target.value)} />
        </Field>
        <Field label="Funding purpose">
          <select className="avi-input" required value={form.funding_purpose} onChange={(e) => set("funding_purpose", e.target.value)}>
            <option value="">Select…</option>
            {FUNDING_PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Location">
          <input className="avi-input" required maxLength={200} placeholder="City, Country" value={form.location} onChange={(e) => set("location", e.target.value)} />
        </Field>
        <Field full label="Detailed explanation of use of funds" hint="What exactly will the capital be deployed against?">
          <textarea
            className="avi-input min-h-[110px]"
            required
            maxLength={4000}
            placeholder="e.g. AED 15M for inventory expansion, AED 5M for new equipment, AED 5M for export LC facility…"
            value={form.use_of_funds_detail}
            onChange={(e) => set("use_of_funds_detail", e.target.value)}
          />
        </Field>
        <Field label="Development / company stage">
          <input className="avi-input" maxLength={200} placeholder="e.g. Operating 8 yrs, expansion phase" value={form.development_stage} onChange={(e) => set("development_stage", e.target.value)} />
        </Field>
        <Field label="Years in operation">
          <input className="avi-input" inputMode="numeric" maxLength={4} value={form.years_in_operation} onChange={(e) => set("years_in_operation", e.target.value)} />
        </Field>
        <Field label="Revenue (USD)" hint="Last full year, if applicable.">
          <input className="avi-input" maxLength={80} value={form.revenue} onChange={(e) => set("revenue", e.target.value)} />
        </Field>
        <Field label="EBITDA (USD)" hint="Last full year, if applicable.">
          <input className="avi-input" maxLength={80} value={form.ebitda} onChange={(e) => set("ebitda", e.target.value)} />
        </Field>
        <Field label="Existing debt (USD)">
          <input className="avi-input" maxLength={80} placeholder="0 if none" value={form.existing_debt} onChange={(e) => set("existing_debt", e.target.value)} />
        </Field>
        <Field label="Cashflow strength">
          <select className="avi-input" value={form.cashflow_strength} onChange={(e) => set("cashflow_strength", e.target.value as FormState["cashflow_strength"])}>
            <option>Strong</option>
            <option>Adequate</option>
            <option>Weak</option>
            <option>Unknown</option>
          </select>
        </Field>
        <Field label="Expected returns">
          <input className="avi-input" maxLength={200} placeholder="IRR / coupon / multiple" value={form.expected_returns} onChange={(e) => set("expected_returns", e.target.value)} />
        </Field>
        <Field label="Preferred financing structure">
          <select className="avi-input" value={form.financing_structure} onChange={(e) => set("financing_structure", e.target.value)}>
            <option value="">Select…</option>
            <option>Equity</option>
            <option>Debt</option>
            <option>Mezzanine</option>
            <option>Islamic Finance</option>
            <option>Joint Venture</option>
            <option>Open to recommendation</option>
          </select>
        </Field>
        <Field label="Sharia requirement">
          <select className="avi-input" value={form.sharia_requirement} onChange={(e) => set("sharia_requirement", e.target.value as FormState["sharia_requirement"])}>
            <option value="Yes">Yes — Required</option>
            <option value="Preferred">Preferred</option>
            <option value="No">No — Not required</option>
          </select>
        </Field>
        <Field full label="Additional notes">
          <textarea className="avi-input min-h-[100px]" maxLength={4000} value={form.additional_notes} onChange={(e) => set("additional_notes", e.target.value)} />
        </Field>
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" className="avi-btn-primary">Continue →</button>
      </div>
      <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
        Assessment: <strong>{meta.title}</strong>
      </p>
    </form>
  );
}

function LeadStep({
  form, set, onBack, onSubmit, loading,
}: {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onBack: () => void; onSubmit: () => void; loading: boolean;
}) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="avi-card mt-10 p-6 md:p-8 space-y-6">
      <div>
        <h2 className="text-lg font-bold">Where shall we send your report?</h2>
        <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
          All information remains confidential.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Full name"><input className="avi-input" required maxLength={120} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} /></Field>
        <Field label="Company name"><input className="avi-input" required maxLength={160} value={form.company_name} onChange={(e) => set("company_name", e.target.value)} /></Field>
        <Field label="Email"><input type="email" className="avi-input" required maxLength={200} value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Phone"><input className="avi-input" required maxLength={40} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Deal type (your preference)">
          <select className="avi-input" value={form.deal_type} onChange={(e) => set("deal_type", e.target.value as FormState["deal_type"])}>
            <option>Equity</option>
            <option>Debt</option>
          </select>
        </Field>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={onBack} className="avi-btn-ghost">← Back</button>
        <button type="submit" disabled={loading} className="avi-btn-primary">
          {loading ? "Generating your report…" : "Generate Report"}
        </button>
      </div>
    </form>
  );
}

function ReportStep({
  meta, report, onDownload, onReset,
}: {
  meta: AssessmentMeta;
  report: AssessmentReport;
  onDownload: () => void; onReset: () => void;
}) {
  return (
    <div className="mt-10 space-y-6">
      <div className="avi-card p-6 md:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[color:var(--color-muted-foreground)]">
          Avi Report — {meta.title}
        </p>

        <ReadinessHero report={report} />

        <Section title="Score Breakdown">
          <ScoreGrid breakdown={report.score_breakdown} />
        </Section>

        <Section title="Executive Summary"><p>{report.executive_summary}</p></Section>

        <Section title="Recommended Financing Structure">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">Funding Requirement</p>
              <p className="mt-1">{report.financing_recommendation.funding_requirement}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">Recommended Instruments</p>
              {report.financing_recommendation.recommended_instruments.length > 0 ? (
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  {report.financing_recommendation.recommended_instruments.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              ) : <p className="mt-1">Information not provided — to be supplied by sponsor.</p>}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">Less Suitable Instruments</p>
              {report.financing_recommendation.less_suitable_instruments.length > 0 ? (
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  {report.financing_recommendation.less_suitable_instruments.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              ) : <p className="mt-1">—</p>}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">Explanation</p>
              <p className="mt-1">{report.financing_recommendation.explanation}</p>
            </div>
          </div>
        </Section>

        <Section title="Key Risks">
          {report.key_risks.length > 0
            ? <ul className="list-disc pl-5 space-y-1">{report.key_risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
            : <p>Information not provided — to be supplied by sponsor.</p>}
        </Section>
        <Section title="Suggested Next Steps">
          {report.suggested_next_steps.length > 0
            ? <ul className="list-disc pl-5 space-y-1">{report.suggested_next_steps.map((r, i) => <li key={i}>{r}</li>)}</ul>
            : <p>Information not provided — to be supplied by sponsor.</p>}
        </Section>
        {report.sharia_assessment && (
          <Section title="Sharia Assessment"><p>{report.sharia_assessment}</p></Section>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onReset} className="avi-btn-ghost">Run another assessment</button>
        <button onClick={onDownload} className="avi-btn-primary">Download Branded PDF</button>
      </div>
      <p className="text-[11px] text-[color:var(--color-muted-foreground)]">Prepared by Avi.</p>
    </div>
  );
}

function ReadinessHero({ report }: { report: AssessmentReport }) {
  const color =
    report.fundability_rating === "High" ? "#107a40" :
    report.fundability_rating === "Medium" ? "#b48214" : "#b43232";
  return (
    <div
      className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded"
      style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-secondary)" }}
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)]">Funding Readiness Score</p>
        <p className="mt-2 text-5xl font-bold">{report.readiness_score_100}<span className="text-lg font-normal text-[color:var(--color-muted-foreground)]"> / 100</span></p>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)]">Fundability Rating</p>
        <p className="mt-2 text-4xl font-bold" style={{ color }}>{report.fundability_rating}</p>
        <p className="mt-1 text-[11px] text-[color:var(--color-muted-foreground)]">High ≥ 75 · Medium 50–74 · Low &lt; 50</p>
      </div>
    </div>
  );
}

function ScoreGrid({ breakdown }: { breakdown: AssessmentReport["score_breakdown"] }) {
  const items: [string, number][] = [
    ["Revenue", breakdown.revenue],
    ["Years in Operation", breakdown.years_in_operation],
    ["Financial Statements", breakdown.financial_statements],
    ["Existing Debt", breakdown.existing_debt],
    ["Cashflow Strength", breakdown.cashflow_strength],
    ["Documentation Completeness", breakdown.documentation_completeness],
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {items.map(([label, score]) => (
        <div key={label} className="border p-3" style={{ borderColor: "var(--color-border)", borderRadius: 6 }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">{label}</p>
          <p className="mt-1 text-xl font-bold">{score}<span className="text-xs font-normal text-[color:var(--color-muted-foreground)]"> / 100</span></p>
          <div className="mt-2 h-1.5 w-full" style={{ backgroundColor: "var(--color-border)" }}>
            <div className="h-1.5" style={{ width: `${score}%`, backgroundColor: "var(--color-foreground)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="text-xs font-bold uppercase tracking-[0.18em]">{title}</h3>
      <div className="mt-2 text-sm leading-relaxed text-[color:var(--color-foreground)]">{children}</div>
    </div>
  );
}
