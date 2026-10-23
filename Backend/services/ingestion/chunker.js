// Step 3 of ingestion: clean lines -> section-aware chunks.
// WHY not fixed-size splitting (v1 used 500 characters): a legal rule cut in half answers
// nothing and gets cited wrongly. We split on section headings first and only cut inside a
// section when it is too long, with overlap so no sentence loses its context.
import { headingInfo } from "./headings.js";

export const MAX_CHARS = 1500; // bge-m3 handles far more; this keeps 4 chunks well inside num_ctx
const OVERLAP_CHARS = 150;
const MIN_SECTION_CHARS = 200; // a bare "1." list item shouldn't become its own tiny chunk

// lines: [{ text, page }]  ->  [{ text, sectionNumber, pageNumber }]
export function chunkLines(lines, { maxChars = MAX_CHARS, overlap = OVERLAP_CHARS } = {}) {
  // 1. Group lines into sections.
  const sections = [];
  let cur = null;
  const size = (s) => s.lines.reduce((n, l) => n + l.text.length, 0);

  for (const line of lines) {
    const h = headingInfo(line.text);
    if (!cur) {
      cur = { sectionNumber: h?.sectionNumber ?? null, page: line.page, lines: [line] };
    } else if (h && (h.strong || size(cur) >= MIN_SECTION_CHARS)) {
      sections.push(cur);
      cur = { sectionNumber: h.sectionNumber, page: line.page, lines: [line] };
    } else {
      cur.lines.push(line);
    }
  }
  if (cur) sections.push(cur);

  // 2. Short sections stay whole; long ones are split with overlap.
  return sections.flatMap((s) => splitSection(s, maxChars, overlap));
}

function splitSection(section, maxChars, overlap) {
  const whole = section.lines.map((l) => l.text).join("\n");
  const base = { sectionNumber: section.sectionNumber };
  if (whole.length <= maxChars) return [{ ...base, text: whole, pageNumber: section.page }];

  // Break into units (lines, or sentences for very long lines) that each fit in a chunk.
  const units = [];
  for (const line of section.lines) {
    const parts = line.text.length <= maxChars ? [line.text] : line.text.split(/(?<=[.?!।;])\s+/);
    for (const p of parts) {
      for (let i = 0; i < p.length; i += maxChars) units.push({ text: p.slice(i, i + maxChars), page: line.page });
    }
  }

  // Each continuation chunk starts with the section heading so it still says what it belongs to.
  const heading = section.lines[0].text.slice(0, 100);
  const chunks = [];
  let buf = [];
  let len = 0;

  const flush = () => {
    const body = buf.map((u) => u.text).join("\n");
    chunks.push({ ...base, text: chunks.length ? `${heading} (continued)\n${body}` : body, pageNumber: buf[0].page });
  };

  for (const u of units) {
    if (buf.length && len + u.text.length + 1 > maxChars) {
      flush();
      // Carry the last few units into the next chunk (overlap).
      const keep = [];
      let keptLen = 0;
      for (let i = buf.length - 1; i >= 0 && keptLen + buf[i].text.length <= overlap; i--) {
        keep.unshift(buf[i]);
        keptLen += buf[i].text.length + 1;
      }
      buf = keep;
      len = keptLen;
    }
    buf.push(u);
    len += u.text.length + 1;
  }
  if (buf.length) flush();
  return chunks;
}
