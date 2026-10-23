// Qdrant REST client (plain fetch). Each point = one chunk's embedding + payload metadata.
// WHY payload metadata: Qdrant can filter by status/documentType *during* the vector search,
// so outdated documents never show up in results.
import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";

async function q(method, path, body) {
  let res;
  try {
    res = await fetch(`${env.QDRANT_URL}/collections/${env.QDRANT_COLLECTION}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new AppError(503, "The vector database (Qdrant) is not reachable.");
  }
  if (res.status === 404 && method === "GET") return null;
  if (!res.ok) throw new AppError(502, `Qdrant error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export async function ensureCollection() {
  if (await q("GET", "")) return;
  await q("PUT", "", { vectors: { size: env.EMBED_DIM, distance: "Cosine" } });
  // Indexes make filtered search fast.
  for (const field of ["documentId", "status", "documentType"]) {
    await q("PUT", "/index", { field_name: field, field_schema: "keyword" });
  }
}

// points: [{ id (uuid), vector, payload }]
export async function upsert(points) {
  await q("PUT", "/points?wait=true", { points });
}

const must = (status, documentType) => {
  const m = [{ key: "status", match: { value: status } }];
  if (documentType) m.push({ key: "documentType", match: { value: documentType } });
  return m;
};

export async function search(vector, limit, documentType) {
  const data = await q("POST", "/points/search", {
    vector,
    limit,
    with_payload: true,
    filter: { must: must("active", documentType) },
  });
  return data.result; // [{ id, score, payload }]
}

const byDocument = (documentId) => ({ must: [{ key: "documentId", match: { value: String(documentId) } }] });

export async function deleteByDocument(documentId) {
  if (!(await q("GET", ""))) return;
  await q("POST", "/points/delete?wait=true", { filter: byDocument(documentId) });
}

export async function setStatus(documentId, status) {
  await q("POST", "/points/payload?wait=true", { payload: { status }, filter: byDocument(documentId) });
}

export async function qdrantHealthy() {
  try {
    return (await fetch(`${env.QDRANT_URL}/readyz`, { signal: AbortSignal.timeout(3000) })).ok;
  } catch {
    return false;
  }
}
