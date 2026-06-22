import { jsPDF } from "jspdf";
import type { AssessmentReport } from "./ai.functions";

interface ReportPdfArgs {
  assessmentTitle: string;
  lead: {
    full_name: string;
    company_name: string;
    email: string;
    phone: string;
    capital_sought: string;
    deal_type: string;
  };
  inputs: Record<string, string>;
  report: AssessmentReport;
}

const FOOTER = "Prepared by Avi.";

export function generateAssessmentPdf(args: ReportPdfArgs): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;

  const ensureSpace = (need: number) => {
    if (y + need > H - 64) {
      addFooter();
      doc.addPage();
      y = M;
      drawHeader();
    }
  };

  const drawHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(10, 10, 10);
    doc.text("AVI", M, M);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text("AI-NATIVE INVESTMENT BANKING — GCC PRIVATE CAPITAL", M + 38, M - 2);
    doc.setDrawColor(220);
    doc.line(M, M + 8, W - M, M + 8);
    y = M + 28;
  };

  const addFooter = () => {
    const pageNum = doc.getNumberOfPages();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120);
    const lines = doc.splitTextToSize(FOOTER, W - M * 2);
    doc.text(lines, M, H - 36);
    doc.text(`Page ${pageNum}`, W - M, H - 18, { align: "right" });
  };

  const h2 = (t: string) => {
    ensureSpace(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(10, 10, 10);
    doc.text(t.toUpperCase(), M, y);
    y += 6;
    doc.setDrawColor(10, 10, 10);
    doc.line(M, y, M + 32, y);
    y += 14;
  };

  const para = (t: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(t, W - M * 2);
    for (const ln of lines) {
      ensureSpace(14);
      doc.text(ln, M, y);
      y += 14;
    }
  };

  const bullets = (items: string[]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    for (const it of items) {
      const lines = doc.splitTextToSize(it, W - M * 2 - 14);
      ensureSpace(14 * lines.length + 2);
      doc.text("•", M, y);
      doc.text(lines, M + 12, y);
      y += 14 * lines.length + 2;
    }
  };

  const kv = (rows: [string, string][]) => {
    doc.setFontSize(9);
    for (const [k, v] of rows) {
      ensureSpace(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(90);
      doc.text(k.toUpperCase(), M, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(20);
      const vl = doc.splitTextToSize(v || "—", W - M * 2 - 160);
      doc.text(vl, M + 160, y);
      y += Math.max(14, vl.length * 12);
    }
  };

  const ratingScoreBox = () => {
    ensureSpace(90);
    const score = args.report.readiness_score_100;
    const rating = args.report.fundability_rating;
    const ratingColor: [number, number, number] =
      rating === "High" ? [16, 122, 64] : rating === "Medium" ? [180, 130, 20] : [180, 50, 50];

    doc.setDrawColor(10);
    doc.setFillColor(245, 245, 245);
    doc.rect(M, y, W - M * 2, 80, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text("FUNDING READINESS SCORE", M + 14, y + 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(36);
    doc.setTextColor(10);
    doc.text(`${score}`, M + 14, y + 60);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(120);
    doc.text("/ 100", M + 14 + doc.getTextWidth(`${score}`) + 6, y + 60);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text("FUNDABILITY RATING", W - M - 200, y + 20);
    doc.setFontSize(24);
    doc.setTextColor(ratingColor[0], ratingColor[1], ratingColor[2]);
    doc.text(rating.toUpperCase(), W - M - 200, y + 56);

    y += 90;
  };

  // PAGE 1
  drawHeader();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(10);
  doc.text(args.assessmentTitle, M, y);
  y += 26;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Prepared for ${args.lead.full_name} — ${args.lead.company_name}`, M, y);
  y += 14;
  doc.text(
    new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
    M,
    y,
  );
  y += 24;

  ratingScoreBox();

  h2("Score Breakdown");
  const sb = args.report.score_breakdown;
  kv([
    ["Revenue", `${sb.revenue} / 100`],
    ["Years in Operation", `${sb.years_in_operation} / 100`],
    ["Financial Statements", `${sb.financial_statements} / 100`],
    ["Existing Debt", `${sb.existing_debt} / 100`],
    ["Cashflow Strength", `${sb.cashflow_strength} / 100`],
    ["Documentation Completeness", `${sb.documentation_completeness} / 100`],
  ]);
  y += 6;

  h2("Executive Summary");
  para(args.report.executive_summary);
  y += 6;

  h2("Sponsor & Deal Snapshot");
  kv([
    ["Sponsor", args.lead.full_name],
    ["Company", args.lead.company_name],
    ["Capital Sought", args.lead.capital_sought],
    ["Deal Type", args.lead.deal_type],
    ["Contact", `${args.lead.email}  |  ${args.lead.phone}`],
  ]);
  y += 6;

  h2("Recommended Financing Structure");
  const fr = args.report.financing_recommendation;
  kv([["Funding Requirement", fr.funding_requirement]]);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(90);
  ensureSpace(14);
  doc.text("RECOMMENDED INSTRUMENTS", M, y);
  y += 12;
  bullets(fr.recommended_instruments.length ? fr.recommended_instruments : ["Information not provided — to be supplied by sponsor."]);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(90);
  ensureSpace(14);
  doc.text("LESS SUITABLE INSTRUMENTS", M, y);
  y += 12;
  bullets(fr.less_suitable_instruments.length ? fr.less_suitable_instruments : ["—"]);
  y += 4;
  para(fr.explanation);
  y += 6;

  h2("Key Risks");
  if (args.report.key_risks.length === 0) {
    para("Information not provided — to be supplied by sponsor.");
  } else {
    bullets(args.report.key_risks);
  }
  y += 6;

  h2("Suggested Next Steps");
  if (args.report.suggested_next_steps.length === 0) {
    para("Information not provided — to be supplied by sponsor.");
  } else {
    bullets(args.report.suggested_next_steps);
  }

  if (args.report.sharia_assessment) {
    y += 6;
    h2("Sharia Assessment");
    para(args.report.sharia_assessment);
  }

  y += 6;
  h2("Inputs Provided by Sponsor");
  kv(Object.entries(args.inputs).map(([k, v]) => [k, v || "Information not provided"]));

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    addFooter();
  }
  return doc;
}
