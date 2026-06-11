import {
  Document, Packer, Paragraph, TextRun, Header, Footer, AlignmentType,
  HeadingLevel, BorderStyle, LevelFormat,
} from "docx";
import { AVI_BRAND } from "./avi-brand";

interface Section { heading: string; body: string }
interface DocContent {
  title: string;
  subtitle: string | null;
  sections?: Section[];
  slides?: { heading: string; bullets: string[]; notes: string | null }[];
  disclaimer: string;
}

export async function renderMandateDocx(content: DocContent, kind: string, mandateLabel: string): Promise<Blob> {
  const children: Paragraph[] = [];
  children.push(new Paragraph({
    children: [new TextRun({ text: content.title || kind, bold: true, size: 44 })],
    spacing: { after: 120 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: `${mandateLabel}${content.subtitle ? " — " + content.subtitle : ""}`, italics: true, color: "555555", size: 22 })],
    spacing: { after: 60 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }), color: "777777", size: 18 })],
    spacing: { after: 240 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 1 } },
  }));

  const blocks = content.slides
    ? content.slides.map((s) => ({ heading: s.heading, bullets: s.bullets || [] }))
    : (content.sections || []).map((s) => ({ heading: s.heading, body: s.body }));

  for (const b of blocks as any[]) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: (b.heading || "").toUpperCase(), bold: true, size: 26 })],
      spacing: { before: 200, after: 100 },
    }));
    if (b.bullets) {
      for (const it of b.bullets) {
        children.push(new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: it, size: 22 })],
          spacing: { after: 60 },
        }));
      }
    } else {
      for (const p of String(b.body || "").split(/\n+/)) {
        children.push(new Paragraph({
          children: [new TextRun({ text: p, size: 22 })],
          spacing: { after: 100 },
        }));
      }
    }
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Verdana", size: 22 } } } },
    numbering: { config: [{
      reference: "bullets",
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
    }] },
    sections: [{
      properties: { page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
      headers: { default: new Header({ children: [new Paragraph({
        children: [
          new TextRun({ text: AVI_BRAND.name + "   ", bold: true, size: 20 }),
          new TextRun({ text: AVI_BRAND.tagline, size: 14, color: "777777" }),
          new TextRun({ text: `\t${kind.toUpperCase()}`, size: 14, color: "777777" }),
        ],
        tabStops: [{ type: "right" as any, position: 9000 }],
      })] }) },
      footers: { default: new Footer({ children: [new Paragraph({
        children: [new TextRun({ text: content.disclaimer || AVI_BRAND.footer, size: 14, color: "888888" })],
      })] }) },
      children,
    }],
  });

  const buf = await Packer.toBlob(doc);
  return buf;
}
