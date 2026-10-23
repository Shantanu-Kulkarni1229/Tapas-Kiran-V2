// The whole ingestion pipeline: PDF -> pages -> clean lines -> chunks -> embeddings -> Mongo + Qdrant.
import { randomUUID } from "node:crypto";
import { Document } from "../../models/Document.js";
import { Chunk } from "../../models/Chunk.js";
import { embed } from "../llm/ollama.js";
import * as qdrant from "../vector/qdrant.js";
import { logger } from "../../utils/logger.js";
import { extractPages } from "./pdf.js";
import { cleanPages } from "./clean.js";
import { chunkLines } from "./chunker.js";

const EMBED_BATCH = 16;

// Marathi and Hindi share the Devanagari script, so we label by script, not by language.
export function detectLanguage(text) {
  const letters = text.match(/\p{L}/gu) || [];
  if (!letters.length) return "en";
  const deva = letters.filter((c) => /[ऀ-ॿ]/.test(c)).length / letters.length;
  return deva > 0.6 ? "devanagari" : deva > 0.1 ? "mixed" : "en";
}

// Re-ingesting a title replaces its old chunks, so there are never duplicates.
export async function ingestPdf({ buffer, filename, title, documentType, version = "1", language, uploadedBy }) {
  await qdrant.ensureCollection();

  const doc = await Document.findOneAndUpdate(
    { title },
    { title, documentType, version, filename, uploadedBy, status: "active", ingestState: "processing", ingestError: null },
    { upsert: true, returnDocument: "after" }
  );

  try {
    // Remove the old version first (both stores).
    await Chunk.deleteMany({ documentId: doc._id });
    await qdrant.deleteByDocument(doc._id);

    const pages = await extractPages(buffer);
    const lines = cleanPages(pages);
    const pieces = chunkLines(lines);
    if (!pieces.length) throw new Error("No text found in this PDF (is it scanned? enable OCR_ENABLED).");

    const lang = language || detectLanguage(pieces.map((p) => p.text).join(" ").slice(0, 20000));
    const meta = { documentId: doc._id, documentTitle: title, documentType, language: lang, version, status: "active" };
    const chunks = await Chunk.insertMany(pieces.map((p, i) => ({ ...meta, ...p, chunkIndex: i })));

    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch = chunks.slice(i, i + EMBED_BATCH);
      const vectors = await embed(batch.map((c) => c.text));
      await qdrant.upsert(
        batch.map((c, j) => ({
          id: randomUUID(),
          vector: vectors[j],
          // text is stored in the payload so a search hit needs no second lookup
          payload: {
            chunkId: String(c._id),
            documentId: String(doc._id),
            documentTitle: title,
            documentType,
            sectionNumber: c.sectionNumber,
            pageNumber: c.pageNumber,
            language: lang,
            version,
            status: "active",
            text: c.text,
          },
        }))
      );
    }

    Object.assign(doc, { pageCount: pages.length, chunkCount: chunks.length, language: lang, ingestState: "ready" });
    await doc.save();
    logger.info({ title, pages: pages.length, chunks: chunks.length }, "document ingested");
    return doc;
  } catch (err) {
    // Don't leave half-indexed data behind.
    await Chunk.deleteMany({ documentId: doc._id });
    await qdrant.deleteByDocument(doc._id).catch(() => {});
    doc.ingestState = "failed";
    doc.ingestError = err.message;
    doc.chunkCount = 0;
    await doc.save();
    throw err;
  }
}

export async function deleteDocument(id) {
  await qdrant.deleteByDocument(id);
  await Chunk.deleteMany({ documentId: id });
  await Document.findByIdAndDelete(id);
}

// Mark a document active/outdated. Outdated chunks are filtered out of both searches.
export async function setDocumentStatus(id, status) {
  const doc = await Document.findByIdAndUpdate(id, { status }, { returnDocument: "after" });
  if (!doc) return null;
  await Chunk.updateMany({ documentId: id }, { status });
  await qdrant.setStatus(id, status);
  return doc;
}
