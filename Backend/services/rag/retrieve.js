// Hybrid retrieval: vector search + keyword search, merged with RRF.
//  - Vector search is good at MEANING ("how do I register a complaint" finds the FIR procedure
//    even if the words differ), and works across Marathi/Hindi/English with bge-m3.
//  - Keyword search is good at EXACT TOKENS ("Section 103", "IIF-4", a form name) that
//    embeddings tend to blur.
// Using both and fusing them covers each other's blind spot.
import { Chunk } from "../../models/Chunk.js";
import { embed } from "../llm/ollama.js";
import * as qdrant from "../vector/qdrant.js";
import { fuse } from "./rrf.js";

export const CANDIDATES = 8; // taken from each search
export const TOP_K = 4; // kept after fusion

async function keywordSearch(question, documentType) {
  const filter = { $text: { $search: question }, status: "active" };
  if (documentType) filter.documentType = documentType;
  return Chunk.find(filter, { score: { $meta: "textScore" } })
    .sort({ score: { $meta: "textScore" } })
    .limit(CANDIDATES)
    .lean();
}

// Returns { chunks, timings: { embedding, retrieval } }; each chunk carries its scores.
export async function retrieve(question, documentType) {
  const t0 = Date.now();
  const [vector] = await embed([question]);
  const t1 = Date.now();

  const [vectorHits, keywordHits] = await Promise.all([qdrant.search(vector, CANDIDATES, documentType), keywordSearch(question, documentType)]);

  const byId = new Map();
  const info = (id) => byId.get(id);
  for (const h of vectorHits) byId.set(h.payload.chunkId, { ...h.payload, vector: h.score });
  for (const c of keywordHits) {
    const id = String(c._id);
    const prev = info(id) || {
      chunkId: id,
      documentTitle: c.documentTitle,
      documentType: c.documentType,
      sectionNumber: c.sectionNumber,
      pageNumber: c.pageNumber,
      text: c.text,
    };
    byId.set(id, { ...prev, keyword: c.score });
  }

  const fused = fuse([vectorHits.map((h) => h.payload.chunkId), keywordHits.map((c) => String(c._id))]);
  const chunks = fused.slice(0, TOP_K).map((f) => ({ ...byId.get(f.id), rrf: f.score }));

  return { chunks, timings: { embedding: t1 - t0, retrieval: Date.now() - t1 } };
}
