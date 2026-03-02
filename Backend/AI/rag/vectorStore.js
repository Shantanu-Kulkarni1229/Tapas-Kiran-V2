// ============================================================
// VECTOR STORE — RAG Pipeline for Tapas Kiran
// Uses: MemoryVectorStore + JSON disk persistence cache
// Embeddings: OpenAI text-embedding-3-small
// ============================================================
// Persistence Strategy:
//   - First run (or --rebuild): process all docs → embed → save cache
//   - Subsequent runs: load cache from disk (fast, no re-embedding)
//   - Cache file: Backend/AI/rag/kb_cache.json
// ============================================================

import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { loadDocumentsFromDirectory, splitDocuments } from "./documentLoader.js";
import fs from "fs";
import readline from "readline";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Path to the on-disk embedding cache
const CACHE_FILE = path.join(__dirname, "kb_cache.json");

// Singleton
let vectorStoreInstance = null;
let isInitialized = false;

// ─────────────────────────────────────────
// Embeddings model
// ─────────────────────────────────────────
function getEmbeddings() {
  return new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "text-embedding-3-small",
    batchSize: 100,   // smaller batch = safer for large docs
  });
}

// ─────────────────────────────────────────
// Cache helpers
// ─────────────────────────────────────────

/**
 * Save the MemoryVectorStore's memoryVectors using NDJSON format
 * Line 1: JSON metadata header
 * Lines 2+: one vector JSON object per line
 * Streaming write avoids V8 JSON.stringify string-length limits
 */
async function saveCache(store, stats) {
  try {
    const vectors = store.memoryVectors;   // array of { content, embedding, metadata }

    await new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(CACHE_FILE, { encoding: "utf8" });
      stream.on("error", reject);
      stream.on("finish", resolve);

      // Line 1: metadata header
      const header = {
        version: "2.0",
        builtAt: new Date().toISOString(),
        totalChunks: vectors.length,
        stats,
      };
      stream.write(JSON.stringify(header) + "\n");

      // Lines 2+: one vector per line (NDJSON)
      for (const v of vectors) {
        stream.write(JSON.stringify(v) + "\n");
      }

      stream.end();
    });

    console.log(`💾 Cache saved → ${CACHE_FILE} (${vectors.length} chunks)`);
  } catch (err) {
    console.warn("⚠️ Could not save cache:", err.message);
  }
}

/**
 * Load the MemoryVectorStore from a NDJSON cache file using streaming readline.
 * Avoids V8 string-length limit that breaks fs.readFileSync on large files.
 * Line 1: JSON metadata header
 * Lines 2+: one vector JSON object per line
 * Returns null if cache doesn't exist or is invalid.
 */
async function loadFromCache() {
  if (!fs.existsSync(CACHE_FILE)) return null;

  try {
    const fileStream = fs.createReadStream(CACHE_FILE, { encoding: "utf8" });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let lineNum = 0;
    let header = null;
    const memoryVectors = [];
    let parseErrors = 0;

    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (lineNum === 0) {
        // First line is the metadata header
        header = JSON.parse(trimmed);
        if (!header.totalChunks || header.totalChunks === 0) {
          rl.close();
          fileStream.destroy();
          return null;
        }
        lineNum++;
        continue;
      }

      // Subsequent lines are vector objects
      try {
        const v = JSON.parse(trimmed);
        memoryVectors.push({
          content: v.content,
          embedding: v.embedding,
          metadata: v.metadata || {},
        });
      } catch {
        parseErrors++;
      }
      lineNum++;

      // Log progress every 5000 vectors
      if (lineNum % 5000 === 0) {
        process.stdout.write(`\r   📂 Loading cache... ${lineNum.toLocaleString()} / ~${header.totalChunks.toLocaleString()}`);
      }
    }

    if (!header) return null;

    process.stdout.write("\n");
    const embeddings = getEmbeddings();
    const store = new MemoryVectorStore(embeddings);
    store.memoryVectors = memoryVectors;

    console.log(`✅ Cache loaded: ${store.memoryVectors.length} chunks (built at ${header.builtAt})`);
    if (parseErrors > 0) console.warn(`   ⚠️  Skipped ${parseErrors} malformed lines`);
    if (header.stats) {
      console.log(`   📚 Documents: ${header.stats.totalDocs} | Folders: ${header.stats.folders?.join(", ") || "N/A"}`);
    }
    return store;
  } catch (err) {
    console.warn("⚠️ Cache load failed (will rebuild):", err.message);
    return null;
  }
}

// ─────────────────────────────────────────
// Build store from scratch
// ─────────────────────────────────────────
async function buildVectorStore(force = false) {
  // Try loading from cache first (unless forced rebuild)
  if (!force) {
    const cached = await loadFromCache();
    if (cached) return cached;
  }

  console.log("\n🔄 Building Tapas Kiran Knowledge Base from documents...");
  console.log("   (This takes a few minutes on first run — won't happen again)\n");

  // 1. Load all docs recursively
  const rawDocs = await loadDocumentsFromDirectory();

  if (rawDocs.length === 0) {
    console.warn("⚠️ No documents found in docs/ — Vector store is empty.");
    const store = new MemoryVectorStore(getEmbeddings());
    isInitialized = true;
    return store;
  }

  // Collect stats for cache metadata
  const folders = [...new Set(rawDocs.map((d) => d.metadata.folder))];
  const stats = {
    totalDocs: rawDocs.length,
    folders,
    files: rawDocs.map((d) => d.metadata.source),
  };

  // 2. Split into chunks
  const chunks = await splitDocuments(rawDocs);
  console.log(`\n📦 Total chunks to embed: ${chunks.length}`);

  // 2b. Safety filter — truncate any chunk exceeding ~1500 chars
  //     Marathi Devanagari tokenizes at ~3x ratio, so 1500 chars ≈ ~1500–4500 tokens,
  //     safely under text-embedding-3-small's 8192-token limit
  const MAX_CHARS = 1500;
  let skipped = 0;
  const safeChunks = chunks.map((c) => {
    if (c.pageContent.length > MAX_CHARS) {
      skipped++;
      return new Document({
        pageContent: c.pageContent.slice(0, MAX_CHARS),
        metadata: c.metadata,
      });
    }
    return c;
  });
  if (skipped > 0) console.log(`   ✂️  Truncated ${skipped} oversized chunks to ${MAX_CHARS} chars`);

  // 3. Embed in batches and build store
  const embeddings = getEmbeddings();
  const batchSize = 25;   // smaller batches → safer for large/complex PDFs
  const store = new MemoryVectorStore(embeddings);
  let skippedChunks = 0;

  for (let i = 0; i < safeChunks.length; i += batchSize) {
    const batch = safeChunks.slice(i, i + batchSize);
    const pct = Math.round(((i + batch.length) / safeChunks.length) * 100);
    process.stdout.write(`\r   🔗 Embedding batch ${i + 1}–${i + batch.length} / ${safeChunks.length} (${pct}%)...`);

    try {
      await store.addDocuments(batch);
    } catch (batchErr) {
      // Batch failed → try each doc individually to isolate bad ones
      for (const doc of batch) {
        try {
          await store.addDocuments([doc]);
        } catch {
          skippedChunks++;
          // skip chunk silently — likely oversized even after truncation
        }
      }
    }
  }
  process.stdout.write("\n");
  if (skippedChunks > 0) {
    console.log(`   ⚠️  Skipped ${skippedChunks} chunks that exceeded token limit`);
  }

  const indexedCount = store.memoryVectors?.length ?? 0;

  // 4. Save to disk cache
  await saveCache(store, stats);

  console.log(`\n✅ Knowledge Base ready: ${indexedCount} chunks from ${rawDocs.length} documents`);
  console.log(`   Folders indexed: ${folders.join(", ")}\n`);

  return store;
}

// ─────────────────────────────────────────
// Public API
// ─────────────────────────────────────────

/**
 * Initialize the vector store (loads from cache or builds fresh)
 * @param {boolean} force - force rebuild even if cache exists
 */
export async function initializeVectorStore(force = false) {
  if (isInitialized && vectorStoreInstance && !force) {
    console.log("ℹ️ Vector store already initialized.");
    return vectorStoreInstance;
  }

  try {
    vectorStoreInstance = await buildVectorStore(force);
    isInitialized = true;
    return vectorStoreInstance;
  } catch (error) {
    console.error("❌ Vector store initialization failed:", error.message);
    // Fallback: empty store so app doesn't crash
    vectorStoreInstance = new MemoryVectorStore(getEmbeddings());
    isInitialized = true;
    return vectorStoreInstance;
  }
}

/**
 * Get the initialized vector store (lazy init)
 */
export async function getVectorStore() {
  if (!isInitialized || !vectorStoreInstance) {
    return await initializeVectorStore();
  }
  return vectorStoreInstance;
}

/**
 * Add new documents (for real-time uploads via admin API)
 * Also updates the disk cache
 */
export async function addDocumentsToStore(chunks) {
  const store = await getVectorStore();
  await store.addDocuments(chunks);

  // Persist updated cache
  const stats = { totalDocs: "custom upload", folders: ["uploaded"] };
  await saveCache(store, stats);

  console.log(`✅ Added ${chunks.length} new chunks to vector store`);
}

/**
 * Similarity search — retrieve top-k relevant chunks
 */
export async function similaritySearch(query, k = 5) {
  const store = await getVectorStore();
  return await store.similaritySearch(query, k);
}

/**
 * Similarity search with score filtering
 */
export async function similaritySearchWithScore(query, k = 5, scoreThreshold = 0.3) {
  const store = await getVectorStore();
  const results = await store.similaritySearchWithScore(query, k);
  return results.filter(([_, score]) => score >= scoreThreshold);
}

/**
 * Reset and force full rebuild on next call
 */
export function resetVectorStore() {
  vectorStoreInstance = null;
  isInitialized = false;
  // Delete cache so next init does a full rebuild
  if (fs.existsSync(CACHE_FILE)) {
    fs.unlinkSync(CACHE_FILE);
    console.log("🗑️ Cache file deleted.");
  }
  console.log("🔄 Vector store reset. Will rebuild on next request.");
}

/**
 * Get retriever interface for LangChain chains
 */
export async function getRetriever(k = 5) {
  const store = await getVectorStore();
  return store.asRetriever({ k });
}

/**
 * Get cache info (for admin API / status)
 */
export function getCacheInfo() {
  if (!fs.existsSync(CACHE_FILE)) {
    return { cached: false };
  }
  try {
    // NDJSON format: first line is the metadata header
    const fd = fs.openSync(CACHE_FILE, "r");
    const buf = Buffer.alloc(4096);
    const bytesRead = fs.readSync(fd, buf, 0, 4096, 0);
    fs.closeSync(fd);

    const firstLine = buf.slice(0, bytesRead).toString("utf8").split("\n")[0];
    const header = JSON.parse(firstLine);
    return {
      cached: true,
      builtAt: header.builtAt,
      totalChunks: header.totalChunks,
      stats: header.stats,
    };
  } catch {
    return { cached: false };
  }
}
