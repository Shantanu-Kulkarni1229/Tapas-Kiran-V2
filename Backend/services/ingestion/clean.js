// Step 2 of ingestion: raw pages -> clean lines, each tagged with its page number.
// Removes things that would pollute search: repeated headers/footers, page numbers,
// and hard line breaks in the middle of sentences.
import { headingInfo } from "./headings.js";

const PAGE_NUMBER = /^[-–—\s]*(?:page|पान|पृष्ठ)?\s*\d{1,4}(?:\s*(?:of|\/)\s*\d{1,4})?[-–—\s]*$/i;
const SENTENCE_END = /[.:;?!।)”"]$/;

// Digits are replaced so "Page 3" and "Page 4" count as the same repeated line.
const fingerprint = (line) => line.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim();

const nonEmptyLines = (text) =>
  text
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

export function cleanPages(pages) {
  const perPage = pages.map((p) => ({ pageNumber: p.pageNumber, lines: nonEmptyLines(p.text) }));

  // A header/footer is a line near the top/bottom of many pages. Needs 3+ pages to judge.
  const repeated = new Set();
  if (perPage.length >= 3) {
    const counts = new Map();
    for (const { lines } of perPage) {
      const edges = new Set([...lines.slice(0, 2), ...lines.slice(-2)].map(fingerprint));
      for (const f of edges) counts.set(f, (counts.get(f) || 0) + 1);
    }
    const threshold = Math.max(3, Math.ceil(perPage.length * 0.4));
    for (const [f, n] of counts) if (n >= threshold) repeated.add(f);
  }

  const out = [];
  for (const { pageNumber, lines } of perPage) {
    const kept = lines.filter((line, i) => {
      const atEdge = i < 2 || i >= lines.length - 2;
      if (!atEdge) return true;
      return !repeated.has(fingerprint(line)) && !PAGE_NUMBER.test(line);
    });

    // Re-join lines the PDF wrapped in the middle of a sentence.
    for (const line of kept) {
      const prev = out[out.length - 1];
      const canJoin = prev && prev.page === pageNumber && !SENTENCE_END.test(prev.text) && !headingInfo(line) && !headingInfo(prev.text);
      if (!canJoin) {
        out.push({ text: line, page: pageNumber });
      } else if (/[A-Za-z]-$/.test(prev.text) && /^[a-z]/.test(line)) {
        prev.text = prev.text.slice(0, -1) + line; // "inves-" + "tigation"
      } else {
        prev.text += " " + line;
      }
    }
  }
  return out;
}
