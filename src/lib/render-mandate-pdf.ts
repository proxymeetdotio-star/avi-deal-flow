import { jsPDF } from "jspdf";
import { AVI_BRAND } from "./avi-brand";

interface Section { heading: string; body: string }
interface DocContent {
  title: string;
  subtitle: string | null;
  sections?: Section[];
  slides?: { heading: string; bullets: string[]; notes: string | null }[];
  disclaimer: string;
}

export function renderMandatePdf(content: DocContent, kind: string, mandateLabel: string): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;

  const drawHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(10);
    doc.text(AVI_BRAND.name, M, M);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(110);
    doc.text(AVI_BRAND.tagline, M + 34, M - 2);
    doc.setFontSize(7);
    doc.text(kind.toUpperCase(), W - M, M, { align: "right" });
    doc.setDrawColor(220);
    doc.line(M, M + 8, W - M, M + 8);
    y = M + 24;
  };

  const addFooter = () => {
    const p = doc.getNumberOfPages();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120);
    const lines = doc.splitTextToSize(content.disclaimer || AVI_BRAND.footer, W - M * 2);
    doc.text(lines, M, H - 36);
    doc.text(`Page ${p}`, W - M, H - 18, { align: "right" });
  };

  const ensure = (need: number) => {
    if (y + need > H - 64) { addFooter(); doc.addPage(); y = M; drawHeader(); }
  };

  const h1 = (t: string) => {
    ensure(40);
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(10);
    const lines = doc.splitTextToSize(t, W - M * 2);
    doc.text(lines, M, y); y += 22 * lines.length + 4;
  };
  const sub = (t: string) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110);
    const lines = doc.splitTextToSize(t, W - M * 2);
    for (const ln of lines) { ensure(14); doc.text(ln, M, y); y += 14; }
    y += 6;
  };
  const h2 = (t: string) => {
    ensure(28); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(10);
    doc.text(t.toUpperCase(), M, y); y += 6;
    doc.setDrawColor(10); doc.line(M, y, M + 32, y); y += 14;
  };
  const para = (t: string) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(40);
    const blocks = (t || "").split(/\n+/);
    for (const block of blocks) {
      const lines = doc.splitTextToSize(block, W - M * 2);
      for (const ln of lines) { ensure(14); doc.text(ln, M, y); y += 14; }
      y += 4;
    }
  };
  const bullets = (items: string[]) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(40);
    for (const it of items) {
      const lines = doc.splitTextToSize(it, W - M * 2 - 14);
      ensure(14 * lines.length + 2);
      doc.text("•", M, y); doc.text(lines, M + 12, y);
      y += 14 * lines.length + 2;
    }
  };

  drawHeader();
  h1(content.title || kind);
  sub(`${mandateLabel}${content.subtitle ? " — " + content.subtitle : ""}`);
  sub(new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }));

  if (content.slides && Array.isArray(content.slides)) {
    for (const s of content.slides) { h2(s.heading); bullets(s.bullets || []); y += 6; }
  } else {
    for (const s of (content.sections || [])) { h2(s.heading); para(s.body); y += 6; }
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) { doc.setPage(i); addFooter(); }
  return doc;
}
