// ============================================================
// BUILD KNOWLEDGE BASE — Tapas Kiran Indexing Script
// Run: node Backend/AI/scripts/buildKB.js
// ============================================================
// This script:
//   1. Scans ALL subfolders in Backend/AI/docs/
//   2. Loads PDFs, DOCX, TXT, XLSX files
//   3. Splits into semantic chunks
//   4. Generates OpenAI embeddings
//   5. Saves a persistent cache (kb_cache.json)
//   6. Prints a full summary
// ============================================================

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Load .env from Backend/
dotenv.config({ path: path.join(__dirname, "../../.env") });

// ─────────────────────────────────────────
// Validation
// ─────────────────────────────────────────
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-...") {
  console.error("\n❌ ERROR: OPENAI_API_KEY is not set in Backend/.env");
  console.error("   Please add your OpenAI API key and re-run this script.\n");
  process.exit(1);
}

// ─────────────────────────────────────────
// Import after env validation
// ─────────────────────────────────────────
import { loadDocumentsFromDirectory, splitDocuments, DOCS_DIR } from "../rag/documentLoader.js";
import { initializeVectorStore, getCacheInfo } from "../rag/vectorStore.js";

// ─────────────────────────────────────────
// Main Build Function
// ─────────────────────────────────────────
async function buildKnowledgeBase() {
  const startTime = Date.now();

  console.log("\n");
  console.log("══════════════════════════════════════════════════════════");
  console.log("  🤖 TAPAS KIRAN (तपास किरण) — Knowledge Base Builder");
  console.log("  Maharashtra Police SOP AI Assistant");
  console.log("══════════════════════════════════════════════════════════\n");

  // Check docs directory
  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`❌ Docs directory not found: ${DOCS_DIR}`);
    process.exit(1);
  }

  console.log(`📁 Docs directory: ${DOCS_DIR}`);
  console.log(`🔑 OpenAI key: ${process.env.OPENAI_API_KEY.substring(0, 8)}...****\n`);

  // Check if cache already exists
  const existingCache = getCacheInfo();
  if (existingCache.cached) {
    console.log(`⚠️  Existing cache found (built: ${existingCache.builtAt})`);
    console.log(`   Chunks: ${existingCache.totalChunks}`);
    console.log("   Rebuilding from scratch...\n");
  }

  // ── Step 1: Force rebuild (reset + rebuild) ──────────────
  console.log("📚 Step 1: Loading documents from all subfolders...\n");
  const { resetVectorStore } = await import("../rag/vectorStore.js");
  resetVectorStore(); // clear existing cache

  // ── Step 2: Build via initializeVectorStore (force=true) ──
  console.log("🔗 Step 2: Generating embeddings (OpenAI text-embedding-3-small)...\n");
  await initializeVectorStore(true);

  // ── Summary ───────────────────────────────────────────────
  const cache = getCacheInfo();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  ✅ KNOWLEDGE BASE BUILD COMPLETE");
  console.log("══════════════════════════════════════════════════════════");
  console.log(`  📦 Total chunks indexed : ${cache.totalChunks}`);
  console.log(`  📄 Total documents      : ${cache.stats?.totalDocs || "N/A"}`);
  console.log(`  📁 Folders indexed      : ${cache.stats?.folders?.join(", ") || "N/A"}`);
  console.log(`  ⏱️  Time taken           : ${elapsed}s`);
  console.log(`  💾 Cache saved to       : Backend/AI/rag/kb_cache.json`);
  console.log("══════════════════════════════════════════════════════════\n");

  if (cache.stats?.files) {
    console.log("📋 Files indexed:");
    cache.stats.files.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));
  }

  console.log("\n🚀 Tapas Kiran is now ready! Start the server: npm run dev\n");
}

// ─────────────────────────────────────────
// Run
// ─────────────────────────────────────────
buildKnowledgeBase().catch((err) => {
  console.error("\n❌ Build failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});
