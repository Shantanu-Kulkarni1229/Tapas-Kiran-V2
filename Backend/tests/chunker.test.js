import { chunkLines } from "../services/ingestion/chunker.js";
import { cleanPages } from "../services/ingestion/clean.js";
import { fuse } from "../services/rag/rrf.js";

const L = (text, page = 1) => ({ text, page });

describe("section-aware chunking", () => {
  test("splits on 'Section N' headings and records the section number", () => {
    const chunks = chunkLines([L("Section 1. Title"), L("Body one."), L("Section 2. Other", 2), L("Body two.", 2)]);
    expect(chunks.map((c) => c.sectionNumber)).toEqual(["1", "2"]);
    expect(chunks[1].pageNumber).toBe(2);
  });

  test("never cuts a short section in the middle", () => {
    const chunks = chunkLines([L("Section 7. Rule"), L("A short rule that must stay whole.")]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain("stay whole");
  });

  test("splits a long section with overlap and repeats the heading", () => {
    const sentences = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} of the long rule.`);
    const chunks = chunkLines([L("Section 9. Long rule"), ...sentences.map((s) => L(s))], { maxChars: 300, overlap: 80 });
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((c) => c.sectionNumber === "9")).toBe(true);
    expect(chunks[1].text.startsWith("Section 9. Long rule (continued)")).toBe(true);
    // overlap: the last sentence of chunk 0 appears again at the start of chunk 1
    const lastOfFirst = chunks[0].text.split("\n").pop();
    expect(chunks[1].text).toContain(lastOfFirst);
  });

  test("a numbered list item does not split a tiny section", () => {
    const chunks = chunkLines([L("1. Purpose"), L("Short."), L("2. Scope"), L("Also short.")]);
    expect(chunks).toHaveLength(1);
  });
});

describe("cleaning", () => {
  const page = (n, body) => ({ pageNumber: n, text: `Station Manual\n${body}\nPage ${n}` });

  test("removes repeated headers/footers and page numbers", () => {
    const lines = cleanPages([page(1, "Alpha."), page(2, "Beta."), page(3, "Gamma.")]);
    expect(lines.map((l) => l.text)).toEqual(["Alpha.", "Beta.", "Gamma."]);
  });

  test("joins lines broken mid-sentence but keeps headings separate", () => {
    const lines = cleanPages([{ pageNumber: 1, text: "Section 1. Title\nthe officer shall\nrecord the entry.\nSection 2. Next" }]);
    expect(lines.map((l) => l.text)).toEqual(["Section 1. Title", "the officer shall record the entry.", "Section 2. Next"]);
  });
});

describe("reciprocal rank fusion", () => {
  test("an item high in both lists beats items high in only one", () => {
    const fused = fuse([["a", "b", "c"], ["d", "b", "e"]]);
    expect(fused[0].id).toBe("b");
    expect(fused.map((f) => f.id)).toContain("d");
  });
});
