// Fills a fixed template with the officer's values and produces a .docx file.
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel } from "docx";
import { TEMPLATES } from "./templates.js";

const FONT = "Nirmala UI"; // ships with Windows/Office and renders Devanagari (Marathi/Hindi)
const text = (t, opts = {}) => new TextRun({ text: String(t ?? ""), font: FONT, ...opts });

// Multi-line values become several lines inside one cell.
const lines = (value) => String(value ?? "").split("\n").map((l) => new Paragraph({ children: [text(l)] }));

const row = (label, value) =>
  new TableRow({
    children: [
      new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [text(label, { bold: true })] })] }),
      new TableCell({ width: { size: 65, type: WidthType.PERCENTAGE }, children: lines(value) }),
    ],
  });

// values: { fieldKey: "text" }; the narrative lives in values[template.narrative.key].
export async function buildDocx(templateId, values) {
  const t = TEMPLATES[templateId];
  const children = [new Paragraph({ heading: HeadingLevel.HEADING_1, children: [text(t.title, { bold: true })] })];

  for (const section of t.sections) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240 }, children: [text(section.title, { bold: true })] }));
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: section.fields.map(([key, label]) => row(label, values[key])) }));
  }

  children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240 }, children: [text(t.narrative.label, { bold: true })] }));
  children.push(...lines(values[t.narrative.key]));
  children.push(new Paragraph({ spacing: { before: 480 }, children: [text("Signature: ______________________    Date: ____________")] }));
  children.push(new Paragraph({ spacing: { before: 240 }, children: [text("Drafted with Tapas Kiran. Reviewed and approved by the officer before use.", { italics: true, size: 18 })] }));

  return Packer.toBuffer(new Document({ sections: [{ children }] }));
}
