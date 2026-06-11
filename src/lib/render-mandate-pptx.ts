import PptxGenJS from "pptxgenjs";
import { AVI_BRAND } from "./avi-brand";

interface DeckContent {
  title: string;
  subtitle: string | null;
  slides?: { heading: string; bullets: string[]; notes: string | null }[];
  sections?: { heading: string; body: string }[];
  disclaimer: string;
}

export async function renderMandatePptx(content: DeckContent, kind: string, mandateLabel: string): Promise<Blob> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5

  const navy = "0A0A0A";
  const accent = "4A7AFF";
  const muted = "777777";

  const addFooter = (slide: PptxGenJS.Slide) => {
    slide.addText(content.disclaimer || AVI_BRAND.footer, {
      x: 0.4, y: 7.05, w: 12.5, h: 0.35, fontSize: 8, color: muted, fontFace: "Verdana",
    });
    slide.addText(`AVI  ·  ${kind.toUpperCase()}`, {
      x: 0.4, y: 0.2, w: 12.5, h: 0.3, fontSize: 9, color: muted, fontFace: "Verdana", bold: true,
    });
  };

  // Title slide
  const title = pptx.addSlide();
  title.background = { color: navy };
  title.addText(AVI_BRAND.name, { x: 0.5, y: 0.4, w: 12, h: 0.4, fontSize: 14, color: "FFFFFF", bold: true, fontFace: "Verdana" });
  title.addText(content.title || kind, { x: 0.5, y: 2.6, w: 12.3, h: 1.6, fontSize: 44, bold: true, color: "FFFFFF", fontFace: "Verdana" });
  title.addText(`${mandateLabel}${content.subtitle ? " — " + content.subtitle : ""}`, {
    x: 0.5, y: 4.4, w: 12.3, h: 0.6, fontSize: 18, color: "CADCFC", fontFace: "Verdana", italic: true,
  });
  title.addText(new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }), {
    x: 0.5, y: 5.1, w: 12, h: 0.4, fontSize: 12, color: "8892A4", fontFace: "Verdana",
  });
  title.addText(content.disclaimer || AVI_BRAND.footer, {
    x: 0.5, y: 7.0, w: 12.3, h: 0.4, fontSize: 8, color: "8892A4", fontFace: "Verdana",
  });

  const slides = content.slides && content.slides.length
    ? content.slides
    : (content.sections || []).map((s) => ({ heading: s.heading, bullets: s.body.split(/\n+/).filter(Boolean), notes: null }));

  for (const s of slides) {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };
    slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.05, fill: { color: accent } });
    slide.addText(s.heading, {
      x: 0.5, y: 0.7, w: 12.3, h: 0.9, fontSize: 28, bold: true, color: navy, fontFace: "Verdana",
    });
    const items = (s.bullets || []).map((b) => ({ text: b, options: { bullet: { code: "25A0" }, color: "1F1F1F" } }));
    if (items.length) {
      slide.addText(items as any, {
        x: 0.6, y: 1.8, w: 12.1, h: 4.8, fontSize: 18, color: "1F1F1F", fontFace: "Verdana", paraSpaceAfter: 8,
      });
    }
    if (s.notes) slide.addNotes(s.notes);
    addFooter(slide);
  }

  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  return blob;
}
